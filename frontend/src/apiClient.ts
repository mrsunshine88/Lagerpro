import { supabase } from './supabaseClient';

const generateEAN13 = () => {
  const prefix = '200';
  const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  const base = prefix + randomPart;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return base + checksum.toString();
};

const getPath = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return url.split('?')[0];
  }
};

const getQueryParams = (url: string) => {
  try {
    return new URL(url).searchParams;
  } catch (e) {
    const search = url.split('?')[1];
    return new URLSearchParams(search || '');
  }
};

const apiClient = {
  get: async (url: string, config?: any) => {
    const path = getPath(url);
    const params = getQueryParams(url);
    
    if (path.includes('/api/products') || path.includes('/api/public/products')) {
      const { data, error } = await supabase.from('products').select('*, variants(*)').order('id', { ascending: false });
      if (error) throw error;
      
      // Map snake_case from DB to camelCase for React
      const mappedData = (data || []).map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        variantLabel1: p.variant_label_1,
        variantLabel2: p.variant_label_2,
        createdAt: p.created_at,
        variants: (p.variants || []).map((v: any) => ({
          ...v,
          imageUrl: v.image_url,
          purchasePrice: v.purchase_price,
          sellingPrice: v.selling_price,
          originalPrice: v.original_price
        }))
      }));
      
      return { data: mappedData };
    }
    
    if (path.includes('/api/bookings')) {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [] };
    }
    
    if (path.includes('/api/analytics')) {
      const { data, error } = await supabase.rpc('get_analytics');
      if (error) {
        console.error('Analytics error:', error);
        return { data: {} };
      }
      return { data: data || {} };
    }
    
    if (path.includes('/api/projects') && !path.includes('/config') && !path.includes('/discount') && !path.includes('/investment')) {
      const { data: prodData } = await supabase.from('products').select('category');
      const prodCategories = (prodData || []).map((d: any) => d.category).filter(Boolean);
      
      const { data: setData } = await supabase.from('settings').select('value').eq('key', 'projects_list').maybeSingle();
      let savedProjects: string[] = [];
      try { savedProjects = JSON.parse(setData?.value || '[]'); } catch(e) {}
      
      const unique = Array.from(new Set([...prodCategories, ...savedProjects]));
      return { data: unique };
    }

    if (path.includes('/api/projects/config') || path.includes('/api/public/projects/config')) {
      const project = params.get('project');
      const { data, error } = await supabase.from('settings').select('*').eq('project', project).maybeSingle();
      if (error) return { data: {} };
      return { data: data?.value || {} };
    }
    
    if (path.includes('/api/projects/discount')) {
      // It expects project discount percentage. This is saved in settings under 'project_discount_NAME'.
      const project = params.get('project');
      const { data, error } = await supabase.from('settings').select('value').eq('key', `project_discount_${project}`).maybeSingle();
      if (error) return { data: { discount_percent: 0 } };
      return { data: { discount_percent: parseFloat(data?.value) || 0 } };
    }

    if (path.includes('/api/public/discount-codes/validate')) {
      const code = params.get('code') || '';
      const category = params.get('category') || '';
      
      const { data, error } = await supabase.from('discount_codes').select('*').ilike('code', code).maybeSingle();
      if (error || !data) {
        return { data: { valid: false, message: 'Ogiltig rabattkod' } };
      }
      
      // Check if project applies
      const project = (data.project || '').toLowerCase();
      if (project !== 'alla' && project !== 'allmänt' && project !== 'all' && project !== category.toLowerCase()) {
        return { data: { valid: false, project: data.project } };
      }
      
      return { data: { valid: true, discountPercent: data.discount_percent, freeShipping: data.free_shipping } };
    }

    if (path.includes('/api/discount-codes')) {
      const { data, error } = await supabase.from('discount_codes').select('*');
      if (error) throw error;
      return { data: data || [] };
    }

    if (path.includes('/api/users/profile')) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { data: null };
      const { data, error } = await supabase.from('users').select('*').eq('email', session.user.email).maybeSingle();
      if (error) return { data: null };
      return { data };
    }

    if (path.includes('/api/users')) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return { data: data || [] };
    }

    if (path.includes('/api/public/settings/') || path.includes('/api/settings/')) {
      const key = path.split('/').pop();
      const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
      if (error || !data) return { data: {} };
      let val = data.value;
      try {
        if (typeof val === 'string' && val.startsWith('{')) val = JSON.parse(val);
      } catch (e) {}
      return { data: val || {} };
    }
    
    if (path.includes('/api/projects/investment')) {
      const project = params.get('project');
      const { data, error } = await supabase.from('settings').select('value').eq('key', `investment_${project}`).maybeSingle();
      if (error || !data) return { data: { investment: 0 } };
      return { data: { investment: parseFloat(data.value) || 0 } };
    }

    if (path.includes('/api/paypal/config')) {
      const { data, error } = await supabase.from('settings').select('*').in('key', ['paypal_client_id', 'paypal_webhook_id', 'paypal_mode', 'paypal_category_filter', 'paypal_secret']);
      if (error || !data) return { data: {} };
      const config: any = {};
      data.forEach((row: any) => {
        const k = row.key.replace('paypal_', '');
        config[k] = row.value;
      });
      return { data: config };
    }

    if (path.includes('/api/public/paypal/client-id')) {
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'paypal_client_id').maybeSingle();
      if (error || !data) return { data: { client_id: '' } };
      return { data: { client_id: data.value } };
    }

    console.warn('Unhandled GET', path);
    return { data: null };
  },

  post: async (url: string, data?: any, config?: any) => {
    const path = getPath(url);

    if (path.includes('/api/login')) {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) throw error;
      return { data: { success: true, access_token: authData.session?.access_token } };
    }

    if (path.includes('/api/logout')) {
      await supabase.auth.signOut();
      return { data: { success: true } };
    }

    if (path.includes('/api/pos/checkout')) {
      const { data: res, error } = await supabase.functions.invoke('pos-checkout', { body: data });
      if (error) throw error;
      return { data: res };
    }

    if (path.includes('/api/admin/shipping/') && path.includes('/label')) {
      const parts = path.split('/');
      const bookingId = parseInt(parts[parts.length - 2]);
      const { data: res, error } = await supabase.functions.invoke('shipping-label', { body: { bookingId } });
      if (error) throw error;
      return { data: res };
    }

    if (path.includes('/api/bookings/') && path.includes('/confirm')) {
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 2]);
      const { data: res, error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
      if (error) throw error;
      return { data: res };
    }

    if (path.includes('/api/bookings/') && path.includes('/reserve')) {
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 2]);
      const { data: res, error } = await supabase.from('bookings').update({ status: 'reserved' }).eq('id', id);
      if (error) throw error;
      return { data: res };
    }

    if (path.includes('/api/bookings/') && path.includes('/cancel')) {
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 2]);
      const { data: res, error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      return { data: res };
    }
    
    if (path.includes('/api/bookings/batch')) {
      if (data.items) {
        const rpcPayload = data.items.map((item: any) => ({
          variant_id: item.variant_id || item.variantId,
          customer_first_name: data.first_name,
          customer_last_name: data.last_name,
          customer_phone: data.phone,
          discount_code: data.discount_code,
          message: data.message,
          delivery_method: data.delivery_method,
          shipping_address: data.shipping_address,
          shipping_cost: data.shipping_cost,
          payment_status: data.payment_status,
          status: 'pending'
        }));
        const { data: res, error } = await supabase.rpc('checkout_cart', { payload: rpcPayload });
        if (error) throw error;
        return { data: res };
      } else if (data.bookings) {
        const { data: res, error } = await supabase.from('bookings').insert(data.bookings);
        if (error) throw error;
        return { data: res };
      }
      return { data: { success: false } };
    }

    if (path.includes('/api/bookings')) {
      const { data: res, error } = await supabase.from('bookings').insert([data]);
      if (error) throw error;
      return { data: res };
    }

    if (path.includes('/api/products') && !path.includes('/api/public')) {
      // Create product + variants
      const variants = data.variants;
      delete data.variants;
      const { data: prod, error: pErr } = await supabase.from('products').insert(data).select().single();
      if (pErr) throw pErr;
      if (variants && variants.length > 0) {
        const variantsToInsert = variants.map((v: any) => {
          const sku = v.sku?.trim() ? v.sku.trim() : generateEAN13();
          return {
            product_id: prod.id,
            size: v.size || '',
            color: v.color || '',
            stock: v.stock || 0,
            sku: sku,
            purchase_price: v.purchase_price ?? v.purchasePrice ?? 0,
            selling_price: v.selling_price ?? v.sellingPrice ?? 0,
            original_price: v.original_price ?? v.originalPrice ?? 0,
            image_url: v.image_url || v.imageUrl || null
          };
        });
        const { error: vErr } = await supabase.from('variants').insert(variantsToInsert);
        if (vErr) throw vErr;
      }
      return { data: prod };
    }

    if (path.includes('/api/discount-codes')) {
      const parts = path.split('/');
      if (parts.length > 3 && parts[3] !== '') {
        const id = parseInt(parts[3]);
        const { data: res, error } = await supabase.from('discount_codes').update(data).eq('id', id);
        if (error) throw error;
        return { data: res };
      } else {
        const { data: res, error } = await supabase.from('discount_codes').insert(data);
        if (error) throw error;
        return { data: res };
      }
    }

    if (path.includes('/api/upload/image')) {
      if (data instanceof FormData) {
        const file = data.get('image') as File;
        if (file) {
          const { data: uploadData, error } = await supabase.storage.from('images').upload(file.name, file, { upsert: true });
          if (error) throw error;
          const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(uploadData.path);
          return { data: { success: true, url: publicUrlData.publicUrl } };
        }
      }
      return { data: { success: false, error: 'No image found' } };
    }

    if (path.includes('/api/projects') && !path.includes('/config') && !path.includes('/discount') && !path.includes('/investment')) {
      const projectName = data?.name;
      if (!projectName) return { data: null };
      
      const { data: current } = await supabase.from('settings').select('value').eq('key', 'projects_list').maybeSingle();
      let list: string[] = [];
      try { list = JSON.parse(current?.value || '[]'); } catch(e) {}
      
      if (!list.includes(projectName)) {
        list.push(projectName);
        await supabase.from('settings').upsert({ key: 'projects_list', value: JSON.stringify(list) }, { onConflict: 'key' });
      }
      return { data: { success: true } };
    }

    if (path.includes('/api/projects/investment')) {
      const { error } = await supabase.from('settings').upsert({ key: `project_investment_${data.project}`, value: data.investment, project: data.project }, { onConflict: 'key' });
      if (error) throw error;
      return { data: { success: true } };
    }

    if (path.includes('/api/projects/discount')) {
      const { error } = await supabase.from('settings').upsert({ key: `project_discount_${data.project}`, value: data.discount_percent, project: data.project }, { onConflict: 'key' });
      if (error) throw error;
      // Tell DB to recalculate prices for this category
      await supabase.rpc('apply_project_discount', { p_category: data.project, p_discount: data.discount_percent });
      return { data: { success: true } };
    }

    if (path.includes('/api/projects/config')) {
      const { error } = await supabase.from('settings').upsert({ key: `project_config_${data.project}`, value: JSON.stringify(data), project: data.project }, { onConflict: 'key' });
      if (error) throw error;
      return { data: { success: true } };
    }

    if (path.includes('/api/settings/')) {
      const key = path.split('/').pop();
      const { error } = await supabase.from('settings').upsert({ key, value: typeof data === 'object' ? JSON.stringify(data) : data }, { onConflict: 'key' });
      if (error) throw error;
      return { data: { success: true } };
    }

    if (path.includes('/api/users/profile')) {
      const { error } = await supabase.auth.updateUser({ email: data.email, password: data.password });
      if (error) throw error;
      // also update public user table
      await supabase.from('users').update({ email: data.email }).eq('email', data.email);
      return { data: { success: true, email: data.email, message: 'Profile updated' } };
    }

    if (path.includes('/api/users') && !path.includes('/profile')) {
      // 1. Insert into public.users FIRST while we are still logged in as admin!
      const { data: res, error } = await supabase.from('users').insert({
        email: data.email,
        role: data.role,
        allowed_projects: data.allowed_projects || ''
      }).select().single();
      if (error) throw error;

      // 2. Create the auth user (this will auto-login the new user, unfortunately)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      // We ignore authError here if it says "User already registered" just in case they existed
      if (authError && !authError.message.includes('already registered')) throw authError;
      
      return { data: res };
    }

    console.warn('Unhandled POST', path);
    return { data: null };
  },

  put: async (url: string, data?: any, config?: any) => {
    const path = getPath(url);

    if (path.includes('/api/products/')) {
      const id = parseInt(path.split('/').pop()!);
      const variants = data.variants;
      delete data.variants;
      const { error: pErr } = await supabase.from('products').update(data).eq('id', id);
      if (pErr) throw pErr;
      
      // simplistic variants handling: delete old ones and insert new ones
      await supabase.from('variants').delete().eq('product_id', id);
      if (variants && variants.length > 0) {
        const variantsToInsert = variants.map((v: any) => {
          const sku = v.sku?.trim() ? v.sku.trim() : generateEAN13();
          return {
            product_id: id,
            size: v.size || '',
            color: v.color || '',
            stock: v.stock || 0,
            sku: sku,
            purchase_price: v.purchase_price ?? v.purchasePrice ?? 0,
            selling_price: v.selling_price ?? v.sellingPrice ?? 0,
            original_price: v.original_price ?? v.originalPrice ?? 0,
            image_url: v.image_url || v.imageUrl || null
          };
        });
        const { error: vErr } = await supabase.from('variants').insert(variantsToInsert);
        if (vErr) throw vErr;
      }
      return { data: { success: true } };
    }

    console.warn('Unhandled PUT', path);
    return { data: null };
  },

  delete: async (url: string, config?: any) => {
    const path = getPath(url);

    if (path.includes('/api/products/')) {
      const id = parseInt(path.split('/').pop()!);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } };
    }

    if (path.includes('/api/discount-codes/')) {
      const id = parseInt(path.split('/').pop()!);
      const { error } = await supabase.from('discount_codes').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } };
    }

    if (path.includes('/api/transactions/')) {
      const id = parseInt(path.split('/').pop()!);
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } };
    }

    if (path.includes('/api/projects') && !path.includes('/config') && !path.includes('/discount') && !path.includes('/investment')) {
      const projectName = config?.data?.name;
      if (projectName) {
        const { data: current } = await supabase.from('settings').select('value').eq('key', 'projects_list').maybeSingle();
        let list: string[] = [];
        try { list = JSON.parse(current?.value || '[]'); } catch(e) {}
        list = list.filter(n => n !== projectName);
        await supabase.from('settings').upsert({ key: 'projects_list', value: JSON.stringify(list) }, { onConflict: 'key' });
      }
      return { data: { success: true } };
    }

    console.warn('Unhandled DELETE', path);
    return { data: null };
  }
};

export default apiClient;
