import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Product } from '../entities/product.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Setting } from '../entities/setting.entity.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    @InjectRepository(Setting)
    private readonly settingRepository: EntityRepository<Setting>,
    private readonly em: EntityManager,
  ) {}

  async getAnalytics(): Promise<any> {
    // 1. Get all distinct categories
    const categoriesResult = await this.em.getConnection().execute(
      'SELECT DISTINCT category FROM products'
    );
    const categories = categoriesResult.map((r: any) => r.category).filter(Boolean);

    const categoryCosts: Record<string, number> = {};
    const categoryInvestments: Record<string, number> = {};

    for (const cat of categories) {
      // Fetch investment from settings for this category
      const settingInv = await this.settingRepository.findOne({ key: `investment_${cat}` });
      let investment = settingInv && settingInv.value ? parseFloat(settingInv.value) : 0.0;

      // Fallback: sum of all purchase transactions if no investment is configured
      if (investment <= 0) {
        const purchaseSumResult = await this.em.getConnection().execute(
          `SELECT SUM(t.quantity * t.purchase_price) as total 
           FROM transactions t
           JOIN variants v ON t.variant_id = v.id
           JOIN products p ON v.product_id = p.id
           WHERE p.category = ? AND t.type = 'purchase'`,
          [cat]
        );
        investment = purchaseSumResult[0]?.total ? parseFloat(purchaseSumResult[0].total) : 0.0;
      }

      categoryInvestments[cat] = investment;

      // Current stock sum
      const stockSumResult = await this.em.getConnection().execute(
        `SELECT SUM(v.stock) as total
         FROM variants v
         JOIN products p ON v.product_id = p.id
         WHERE p.category = ?`,
        [cat]
      );
      const currentStock = stockSumResult[0]?.total ? parseInt(stockSumResult[0].total) : 0;

      // Sold sum
      const soldSumResult = await this.em.getConnection().execute(
        `SELECT SUM(t.quantity) as total
         FROM transactions t
         JOIN variants v ON t.variant_id = v.id
         JOIN products p ON v.product_id = p.id
         WHERE p.category = ? AND t.type = 'sale'`,
        [cat]
      );
      const soldCount = soldSumResult[0]?.total ? parseInt(soldSumResult[0].total) : 0;

      const totalShoes = currentStock + soldCount;
      categoryCosts[cat] = totalShoes > 0 ? investment / totalShoes : 0.0;
    }

    // 1. Total Stock Value (using category cost per shoe)
    const allVariants = await this.variantRepository.find({}, { populate: ['product'] });
    const totalStockCost = allVariants.reduce((sum, v) => {
      const cat = v.product.category;
      const costPerShoe = categoryCosts[cat] || 0.0;
      return sum + v.stock * costPerShoe;
    }, 0.0);

    // 2. Total Potential Sales Value
    const potentialSalesResult = await this.em.getConnection().execute(
      `SELECT SUM(stock * selling_price) as total FROM variants`
    );
    const potentialSalesVal = potentialSalesResult[0]?.total ? parseFloat(potentialSalesResult[0].total) : 0.0;

    // 3. Potential Profit in Stock
    const potentialProfit = potentialSalesVal - totalStockCost;

    // 4. Total Investments
    const totalInvestment = Object.values(categoryInvestments).reduce((sum, val) => sum + val, 0.0);

    // 5. Total Revenues (Faktiska historiska försäljningar)
    const totalRevResult = await this.em.getConnection().execute(
      `SELECT SUM(quantity * selling_price) as total FROM transactions WHERE type = 'sale'`
    );
    const totalRevenue = totalRevResult[0]?.total ? parseFloat(totalRevResult[0].total) : 0.0;

    // 5b. Total Sold Units (Faktiska historiska antalet sålda skor)
    const totalSoldResult = await this.em.getConnection().execute(
      `SELECT SUM(quantity) as total FROM transactions WHERE type = 'sale'`
    );
    const totalSoldUnits = totalSoldResult[0]?.total ? parseInt(totalSoldResult[0].total) : 0;

    // 6. Actual Net Cash Profit (Likviditet: Försäljningar - Inköpskostnad)
    const netProfit = totalRevenue - totalInvestment;

    // --- SALES METRICS PER PERIOD ---
    const now = new Date();
    
    // Start of Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of current week (Monday)
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const currentDay = weekStart.getDay();
    const diffToMonday = weekStart.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    weekStart.setDate(diffToMonday);

    // Start of current month
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const periods = [
      { name: 'today', since: todayStart },
      { name: 'week', since: weekStart },
      { name: 'month', since: monthStart },
    ];

    const financials: Record<string, any> = {};

    for (const period of periods) {
      // Revenue for period
      const revResult = await this.em.getConnection().execute(
        `SELECT SUM(quantity * selling_price) as total 
         FROM transactions 
         WHERE type = 'sale' AND created_at >= ?`,
        [period.since]
      );
      const rev = revResult[0]?.total ? parseFloat(revResult[0].total) : 0.0;

      // Period sales list to compute average category costs
      const periodSales = await this.transactionRepository.find(
        { type: 'sale', createdAt: { $gte: period.since } },
        { populate: ['variant', 'variant.product'] },
      );

      const cost = periodSales.reduce((sum, transaction) => {
        const cat = transaction.variant.product.category;
        const costPerShoe = categoryCosts[cat] || 0.0;
        return sum + transaction.quantity * costPerShoe;
      }, 0.0);

      const profit = rev - cost;
      const margin = rev > 0 ? (profit / rev) * 100 : 0.0;

      financials[period.name] = {
        revenue: rev,
        cost,
        profit,
        margin,
      };
    }

    // Recent Sales History (Limit 15)
    const recentSales = await this.transactionRepository.find(
      { type: 'sale' },
      {
        populate: ['variant', 'variant.product'],
        orderBy: { id: 'DESC' },
        limit: 15,
      },
    );

    const salesHistory = recentSales.map((s) => {
      const cat = s.variant.product.category;
      const catCostPerShoe = categoryCosts[cat] || 0.0;
      return {
        id: s.id,
        quantity: s.quantity,
        selling_price: s.sellingPrice,
        purchase_price: catCostPerShoe, // Override purchase price with average project cost per shoe
        created_at: s.createdAt,
        size: s.variant.size,
        color: s.variant.color,
        model_name: s.variant.product.name,
        category: cat,
      };
    });

    // 7. Project Summaries (Breakdown per Category/Project)
    const projectSummaries = [];
    for (const cat of categories) {
      const costPerShoe = categoryCosts[cat] || 0.0;

      // Stock potential sales for this category
      const stockPotentialResult = await this.em.getConnection().execute(
        `SELECT SUM(v.stock * v.selling_price) as total
         FROM variants v
         JOIN products p ON v.product_id = p.id
         WHERE p.category = ?`,
        [cat]
      );
      const catStockPotential = stockPotentialResult[0]?.total ? parseFloat(stockPotentialResult[0].total) : 0.0;

      // Stock count
      const stockCountResult = await this.em.getConnection().execute(
        `SELECT SUM(v.stock) as total
         FROM variants v
         JOIN products p ON v.product_id = p.id
         WHERE p.category = ?`,
        [cat]
      );
      const catStockCount = stockCountResult[0]?.total ? parseInt(stockCountResult[0].total) : 0;

      const catStockCost = catStockCount * costPerShoe;
      const catInvestment = categoryInvestments[cat] || 0.0;

      // Revenue for this category
      const revResult = await this.em.getConnection().execute(
        `SELECT SUM(t.quantity * t.selling_price) as total
         FROM transactions t
         JOIN variants v ON t.variant_id = v.id
         JOIN products p ON v.product_id = p.id
         WHERE p.category = ? AND t.type = 'sale'`,
        [cat]
      );
      const catRevenue = revResult[0]?.total ? parseFloat(revResult[0].total) : 0.0;

      const catNet = catRevenue - catInvestment;
      const catBePct = catInvestment > 0 ? (catRevenue / catInvestment) * 100 : 0.0;

      projectSummaries.push({
        name: cat,
        stock_count: catStockCount,
        stock_cost: catStockCost,
        potential_sales: catStockPotential,
        total_investment: catInvestment,
        total_revenue: catRevenue,
        net_profit: catNet,
        be_percentage: catBePct,
        cost_per_shoe: costPerShoe,
      });
    }

    return {
      is_lump_sum: true,
      total_sold_units: totalSoldUnits,
      stock_metrics: {
        total_cost: totalStockCost,
        potential_sales: potentialSalesVal,
        potential_profit: potentialProfit,
      },
      break_even: {
        total_investment: totalInvestment,
        total_revenue: totalRevenue,
        net_profit: netProfit,
      },
      financials,
      recent_sales: salesHistory,
      project_summaries: projectSummaries,
    };
  }
}
