"""
seed_full_lager.py
------------------
Seeds the Lagerpro database with 240 shoe models across 4 categories:
  - Cinnamonskor  (60 models)
  - Streetwear    (60 models)
  - Klassiker     (60 models)
  - Sport         (60 models)

Each model gets one variant per size (36-46) with realistic stock,
purchase price, and selling price values.

Can be run standalone:
    python seed_full_lager.py

Or imported and called from app.py:
    import seed_full_lager
    seed_full_lager.seed_full_lager()
"""

import os
import re
import sqlite3
from datetime import datetime

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "database.db"))

# ---------------------------------------------------------------------------
# Product catalogue – 60 models per category = 240 total
# Each entry: (name, description, sizes, purchase_price, selling_price, color)
# ---------------------------------------------------------------------------

SIZES_FULL = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]
SIZES_STREET = ["38", "39", "40", "41", "42", "43", "44", "45"]
SIZES_SPORT = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]

CATALOGUE = {
    "Cinnamonskor": [
        ("Cinnamon Classic Low", "Låg sneaker med kanelton", SIZES_FULL, 280, 599, "Beige"),
        ("Cinnamon Classic High", "Hög sneaker med kanelton", SIZES_FULL, 300, 649, "Beige"),
        ("Cinnamon Suede Low", "Mocka sneaker i kanelfärg", SIZES_FULL, 320, 699, "Brun"),
        ("Cinnamon Suede High", "Hög mocka sneaker", SIZES_FULL, 340, 749, "Brun"),
        ("Cinnamon Runner", "Löparsneaker i kanelton", SIZES_FULL, 350, 799, "Beige"),
        ("Cinnamon Slip-On", "Slip-on i kanelfärg", SIZES_FULL, 260, 549, "Beige"),
        ("Cinnamon Platform", "Platåsneaker i kanelton", SIZES_FULL, 370, 849, "Beige"),
        ("Cinnamon Chelsea", "Chelsea boot i kanelfärg", SIZES_FULL, 390, 899, "Brun"),
        ("Cinnamon Derby", "Derby sko i kanelton", SIZES_FULL, 360, 799, "Brun"),
        ("Cinnamon Loafer", "Loafer i kanelfärg", SIZES_FULL, 340, 749, "Beige"),
        ("Cinnamon Mule", "Mule i kanelton", SIZES_FULL, 280, 599, "Beige"),
        ("Cinnamon Sandal", "Sandal i kanelfärg", SIZES_FULL, 220, 499, "Beige"),
        ("Cinnamon Boot", "Stövel i kanelton", SIZES_FULL, 420, 949, "Brun"),
        ("Cinnamon Oxford", "Oxford i kanelfärg", SIZES_FULL, 380, 849, "Brun"),
        ("Cinnamon Monk", "Monk strap i kanelton", SIZES_FULL, 400, 899, "Brun"),
        ("Cinnamon Espadrille", "Espadrille i kanelfärg", SIZES_FULL, 240, 529, "Beige"),
        ("Cinnamon Wedge", "Kilklack i kanelton", SIZES_FULL, 310, 679, "Beige"),
        ("Cinnamon Ankle Boot", "Ankelstövel i kanelfärg", SIZES_FULL, 410, 929, "Brun"),
        ("Cinnamon Sneaker Pro", "Pro sneaker i kanelton", SIZES_FULL, 360, 799, "Beige"),
        ("Cinnamon Trail", "Trail sneaker i kanelfärg", SIZES_FULL, 380, 849, "Brun"),
        ("Cinnamon Retro Low", "Retro låg sneaker", SIZES_FULL, 290, 629, "Beige"),
        ("Cinnamon Retro High", "Retro hög sneaker", SIZES_FULL, 310, 679, "Beige"),
        ("Cinnamon Canvas Low", "Canvas låg sneaker", SIZES_FULL, 250, 549, "Beige"),
        ("Cinnamon Canvas High", "Canvas hög sneaker", SIZES_FULL, 270, 589, "Beige"),
        ("Cinnamon Leather Low", "Läder låg sneaker", SIZES_FULL, 330, 729, "Brun"),
        ("Cinnamon Leather High", "Läder hög sneaker", SIZES_FULL, 350, 779, "Brun"),
        ("Cinnamon Mesh Runner", "Mesh löparsneaker", SIZES_FULL, 340, 749, "Beige"),
        ("Cinnamon Knit Low", "Stickad låg sneaker", SIZES_FULL, 300, 659, "Beige"),
        ("Cinnamon Knit High", "Stickad hög sneaker", SIZES_FULL, 320, 699, "Beige"),
        ("Cinnamon Velvet Low", "Sammet låg sneaker", SIZES_FULL, 360, 799, "Brun"),
        ("Cinnamon Velvet High", "Sammet hög sneaker", SIZES_FULL, 380, 849, "Brun"),
        ("Cinnamon Patent Low", "Lackläder låg sneaker", SIZES_FULL, 370, 829, "Brun"),
        ("Cinnamon Patent High", "Lackläder hög sneaker", SIZES_FULL, 390, 879, "Brun"),
        ("Cinnamon Nubuck Low", "Nubuck låg sneaker", SIZES_FULL, 340, 749, "Beige"),
        ("Cinnamon Nubuck High", "Nubuck hög sneaker", SIZES_FULL, 360, 799, "Beige"),
        ("Cinnamon Woven Low", "Vävd låg sneaker", SIZES_FULL, 280, 619, "Beige"),
        ("Cinnamon Woven High", "Vävd hög sneaker", SIZES_FULL, 300, 659, "Beige"),
        ("Cinnamon Perforated Low", "Perforerad låg sneaker", SIZES_FULL, 290, 639, "Beige"),
        ("Cinnamon Perforated High", "Perforerad hög sneaker", SIZES_FULL, 310, 679, "Beige"),
        ("Cinnamon Zip Low", "Dragkedja låg sneaker", SIZES_FULL, 320, 699, "Brun"),
        ("Cinnamon Zip High", "Dragkedja hög sneaker", SIZES_FULL, 340, 749, "Brun"),
        ("Cinnamon Buckle Low", "Spänne låg sneaker", SIZES_FULL, 330, 729, "Brun"),
        ("Cinnamon Buckle High", "Spänne hög sneaker", SIZES_FULL, 350, 779, "Brun"),
        ("Cinnamon Lace Low", "Snörning låg sneaker", SIZES_FULL, 270, 589, "Beige"),
        ("Cinnamon Lace High", "Snörning hög sneaker", SIZES_FULL, 290, 629, "Beige"),
        ("Cinnamon Velcro Low", "Kardborre låg sneaker", SIZES_FULL, 260, 569, "Beige"),
        ("Cinnamon Velcro High", "Kardborre hög sneaker", SIZES_FULL, 280, 609, "Beige"),
        ("Cinnamon Elastic Low", "Elastisk låg sneaker", SIZES_FULL, 250, 549, "Beige"),
        ("Cinnamon Elastic High", "Elastisk hög sneaker", SIZES_FULL, 270, 589, "Beige"),
        ("Cinnamon Tassel Loafer", "Tofs loafer", SIZES_FULL, 360, 799, "Brun"),
        ("Cinnamon Horsebit Loafer", "Horsebit loafer", SIZES_FULL, 380, 849, "Brun"),
        ("Cinnamon Penny Loafer", "Penny loafer", SIZES_FULL, 350, 779, "Brun"),
        ("Cinnamon Driving Shoe", "Körsko i kanelton", SIZES_FULL, 320, 699, "Brun"),
        ("Cinnamon Boat Shoe", "Båtsko i kanelfärg", SIZES_FULL, 300, 659, "Beige"),
        ("Cinnamon Desert Boot", "Desert boot i kanelton", SIZES_FULL, 370, 829, "Brun"),
        ("Cinnamon Chukka", "Chukka boot i kanelfärg", SIZES_FULL, 360, 799, "Brun"),
        ("Cinnamon Brogue", "Brogue i kanelton", SIZES_FULL, 390, 879, "Brun"),
        ("Cinnamon Wingtip", "Wingtip i kanelfärg", SIZES_FULL, 400, 899, "Brun"),
        ("Cinnamon Cap Toe", "Cap toe i kanelton", SIZES_FULL, 380, 849, "Brun"),
        ("Cinnamon Plain Toe", "Plain toe i kanelfärg", SIZES_FULL, 360, 799, "Brun"),
    ],
    "Streetwear": [
        ("Street Force 1 Low", "Klassisk street låg", SIZES_STREET, 350, 799, "Vit"),
        ("Street Force 1 High", "Klassisk street hög", SIZES_STREET, 370, 849, "Vit"),
        ("Street Dunk Low", "Dunk-inspirerad låg", SIZES_STREET, 360, 819, "Svart"),
        ("Street Dunk High", "Dunk-inspirerad hög", SIZES_STREET, 380, 869, "Svart"),
        ("Street Jordan 1 Low", "Jordan-inspirerad låg", SIZES_STREET, 400, 899, "Röd"),
        ("Street Jordan 1 High", "Jordan-inspirerad hög", SIZES_STREET, 420, 949, "Röd"),
        ("Street Yeezy Boost", "Boost-inspirerad sneaker", SIZES_STREET, 450, 999, "Grå"),
        ("Street Yeezy Slide", "Slide-inspirerad toffel", SIZES_STREET, 200, 449, "Grå"),
        ("Street Foam Runner", "Foam-inspirerad runner", SIZES_STREET, 280, 629, "Beige"),
        ("Street 990 Runner", "990-inspirerad runner", SIZES_STREET, 420, 949, "Grå"),
        ("Street 574 Classic", "574-inspirerad klassiker", SIZES_STREET, 350, 799, "Marinblå"),
        ("Street 550 Basketball", "550-inspirerad basket", SIZES_STREET, 380, 849, "Vit"),
        ("Street Chuck Taylor Low", "Chuck-inspirerad låg", SIZES_STREET, 250, 549, "Vit"),
        ("Street Chuck Taylor High", "Chuck-inspirerad hög", SIZES_STREET, 270, 589, "Vit"),
        ("Street Run Star", "Run Star-inspirerad", SIZES_STREET, 300, 659, "Svart"),
        ("Street Gel-Lyte", "Gel-inspirerad löpare", SIZES_STREET, 390, 879, "Vit"),
        ("Street Gel-Kayano", "Kayano-inspirerad löpare", SIZES_STREET, 410, 929, "Svart"),
        ("Street Gel-Nimbus", "Nimbus-inspirerad löpare", SIZES_STREET, 430, 969, "Blå"),
        ("Street Superstar", "Superstar-inspirerad", SIZES_STREET, 320, 719, "Vit"),
        ("Street Stan Smith", "Stan Smith-inspirerad", SIZES_STREET, 300, 669, "Vit"),
        ("Street Campus", "Campus-inspirerad", SIZES_STREET, 310, 689, "Grön"),
        ("Street Gazelle", "Gazelle-inspirerad", SIZES_STREET, 320, 719, "Marinblå"),
        ("Street Samba", "Samba-inspirerad", SIZES_STREET, 330, 739, "Svart"),
        ("Street Forum Low", "Forum-inspirerad låg", SIZES_STREET, 340, 759, "Vit"),
        ("Street Forum High", "Forum-inspirerad hög", SIZES_STREET, 360, 809, "Vit"),
        ("Street Handball Spezial", "Spezial-inspirerad", SIZES_STREET, 350, 789, "Brun"),
        ("Street Ultraboost", "Ultraboost-inspirerad", SIZES_STREET, 440, 989, "Svart"),
        ("Street NMD R1", "NMD-inspirerad", SIZES_STREET, 400, 899, "Vit"),
        ("Street NMD R2", "NMD R2-inspirerad", SIZES_STREET, 410, 919, "Svart"),
        ("Street Pharrell NMD", "Pharrell NMD-inspirerad", SIZES_STREET, 450, 999, "Flerfärgad"),
        ("Street Old Skool", "Old Skool-inspirerad", SIZES_STREET, 280, 629, "Svart"),
        ("Street Sk8-Hi", "Sk8-Hi-inspirerad", SIZES_STREET, 300, 669, "Svart"),
        ("Street Era", "Era-inspirerad", SIZES_STREET, 260, 579, "Marinblå"),
        ("Street Authentic", "Authentic-inspirerad", SIZES_STREET, 240, 539, "Svart"),
        ("Street Slip-On", "Slip-On-inspirerad", SIZES_STREET, 230, 519, "Svart"),
        ("Street Checkerboard", "Checkerboard-inspirerad", SIZES_STREET, 270, 599, "Svart/Vit"),
        ("Street Blazer Low", "Blazer-inspirerad låg", SIZES_STREET, 320, 719, "Vit"),
        ("Street Blazer Mid", "Blazer-inspirerad mid", SIZES_STREET, 340, 759, "Vit"),
        ("Street Cortez", "Cortez-inspirerad", SIZES_STREET, 290, 649, "Vit"),
        ("Street Waffle Racer", "Waffle-inspirerad", SIZES_STREET, 310, 689, "Brun"),
        ("Street Killshot", "Killshot-inspirerad", SIZES_STREET, 330, 739, "Vit"),
        ("Street Internationalist", "Internationalist-inspirerad", SIZES_STREET, 350, 789, "Svart"),
        ("Street Pegasus", "Pegasus-inspirerad", SIZES_STREET, 380, 849, "Blå"),
        ("Street React", "React-inspirerad", SIZES_STREET, 390, 879, "Vit"),
        ("Street Invincible", "Invincible-inspirerad", SIZES_STREET, 420, 949, "Svart"),
        ("Street Vaporfly", "Vaporfly-inspirerad", SIZES_STREET, 460, 1049, "Grön"),
        ("Street Alphafly", "Alphafly-inspirerad", SIZES_STREET, 480, 1099, "Vit"),
        ("Street Metaspeed", "Metaspeed-inspirerad", SIZES_STREET, 470, 1069, "Blå"),
        ("Street Endorphin", "Endorphin-inspirerad", SIZES_STREET, 440, 989, "Gul"),
        ("Street Kinvara", "Kinvara-inspirerad", SIZES_STREET, 360, 819, "Röd"),
        ("Street Clifton", "Clifton-inspirerad", SIZES_STREET, 380, 859, "Grå"),
        ("Street Bondi", "Bondi-inspirerad", SIZES_STREET, 400, 899, "Svart"),
        ("Street Speedgoat", "Speedgoat-inspirerad", SIZES_STREET, 420, 949, "Orange"),
        ("Street Mafate", "Mafate-inspirerad", SIZES_STREET, 440, 989, "Svart"),
        ("Street Challenger", "Challenger-inspirerad", SIZES_STREET, 360, 819, "Blå"),
        ("Street Torrent", "Torrent-inspirerad", SIZES_STREET, 340, 769, "Grå"),
        ("Street Peregrine", "Peregrine-inspirerad", SIZES_STREET, 380, 859, "Grön"),
        ("Street Ride", "Ride-inspirerad", SIZES_STREET, 350, 789, "Svart"),
        ("Street Guide", "Guide-inspirerad", SIZES_STREET, 370, 829, "Blå"),
        ("Street Triumph", "Triumph-inspirerad", SIZES_STREET, 410, 929, "Vit"),
    ],
    "Klassiker": [
        ("Klassiker Oxford Svart", "Tidlös svart oxford", SIZES_FULL, 400, 899, "Svart"),
        ("Klassiker Oxford Brun", "Tidlös brun oxford", SIZES_FULL, 400, 899, "Brun"),
        ("Klassiker Oxford Tan", "Tidlös tan oxford", SIZES_FULL, 400, 899, "Tan"),
        ("Klassiker Derby Svart", "Klassisk svart derby", SIZES_FULL, 380, 849, "Svart"),
        ("Klassiker Derby Brun", "Klassisk brun derby", SIZES_FULL, 380, 849, "Brun"),
        ("Klassiker Derby Tan", "Klassisk tan derby", SIZES_FULL, 380, 849, "Tan"),
        ("Klassiker Brogue Svart", "Elegant svart brogue", SIZES_FULL, 420, 949, "Svart"),
        ("Klassiker Brogue Brun", "Elegant brun brogue", SIZES_FULL, 420, 949, "Brun"),
        ("Klassiker Brogue Tan", "Elegant tan brogue", SIZES_FULL, 420, 949, "Tan"),
        ("Klassiker Monk Svart", "Stilren svart monk", SIZES_FULL, 440, 989, "Svart"),
        ("Klassiker Monk Brun", "Stilren brun monk", SIZES_FULL, 440, 989, "Brun"),
        ("Klassiker Loafer Svart", "Klassisk svart loafer", SIZES_FULL, 360, 799, "Svart"),
        ("Klassiker Loafer Brun", "Klassisk brun loafer", SIZES_FULL, 360, 799, "Brun"),
        ("Klassiker Loafer Tan", "Klassisk tan loafer", SIZES_FULL, 360, 799, "Tan"),
        ("Klassiker Chelsea Svart", "Elegant svart chelsea", SIZES_FULL, 450, 999, "Svart"),
        ("Klassiker Chelsea Brun", "Elegant brun chelsea", SIZES_FULL, 450, 999, "Brun"),
        ("Klassiker Chelsea Tan", "Elegant tan chelsea", SIZES_FULL, 450, 999, "Tan"),
        ("Klassiker Chukka Svart", "Stilren svart chukka", SIZES_FULL, 410, 929, "Svart"),
        ("Klassiker Chukka Brun", "Stilren brun chukka", SIZES_FULL, 410, 929, "Brun"),
        ("Klassiker Desert Boot Svart", "Klassisk svart desert boot", SIZES_FULL, 390, 879, "Svart"),
        ("Klassiker Desert Boot Brun", "Klassisk brun desert boot", SIZES_FULL, 390, 879, "Brun"),
        ("Klassiker Wingtip Svart", "Elegant svart wingtip", SIZES_FULL, 430, 969, "Svart"),
        ("Klassiker Wingtip Brun", "Elegant brun wingtip", SIZES_FULL, 430, 969, "Brun"),
        ("Klassiker Cap Toe Svart", "Stilren svart cap toe", SIZES_FULL, 410, 929, "Svart"),
        ("Klassiker Cap Toe Brun", "Stilren brun cap toe", SIZES_FULL, 410, 929, "Brun"),
        ("Klassiker Plain Toe Svart", "Klassisk svart plain toe", SIZES_FULL, 390, 879, "Svart"),
        ("Klassiker Plain Toe Brun", "Klassisk brun plain toe", SIZES_FULL, 390, 879, "Brun"),
        ("Klassiker Penny Loafer Svart", "Klassisk svart penny loafer", SIZES_FULL, 370, 829, "Svart"),
        ("Klassiker Penny Loafer Brun", "Klassisk brun penny loafer", SIZES_FULL, 370, 829, "Brun"),
        ("Klassiker Tassel Loafer Svart", "Elegant svart tofs loafer", SIZES_FULL, 380, 849, "Svart"),
        ("Klassiker Tassel Loafer Brun", "Elegant brun tofs loafer", SIZES_FULL, 380, 849, "Brun"),
        ("Klassiker Horsebit Svart", "Stilren svart horsebit", SIZES_FULL, 400, 899, "Svart"),
        ("Klassiker Horsebit Brun", "Stilren brun horsebit", SIZES_FULL, 400, 899, "Brun"),
        ("Klassiker Driving Shoe Svart", "Klassisk svart körsko", SIZES_FULL, 340, 759, "Svart"),
        ("Klassiker Driving Shoe Brun", "Klassisk brun körsko", SIZES_FULL, 340, 759, "Brun"),
        ("Klassiker Boat Shoe Marinblå", "Klassisk marinblå båtsko", SIZES_FULL, 320, 719, "Marinblå"),
        ("Klassiker Boat Shoe Brun", "Klassisk brun båtsko", SIZES_FULL, 320, 719, "Brun"),
        ("Klassiker Moccasin Brun", "Klassisk brun moccasin", SIZES_FULL, 330, 739, "Brun"),
        ("Klassiker Moccasin Tan", "Klassisk tan moccasin", SIZES_FULL, 330, 739, "Tan"),
        ("Klassiker Espadrille Beige", "Klassisk beige espadrille", SIZES_FULL, 240, 539, "Beige"),
        ("Klassiker Espadrille Marinblå", "Klassisk marinblå espadrille", SIZES_FULL, 240, 539, "Marinblå"),
        ("Klassiker Sandal Brun", "Klassisk brun sandal", SIZES_FULL, 260, 579, "Brun"),
        ("Klassiker Sandal Svart", "Klassisk svart sandal", SIZES_FULL, 260, 579, "Svart"),
        ("Klassiker Mule Svart", "Klassisk svart mule", SIZES_FULL, 280, 619, "Svart"),
        ("Klassiker Mule Brun", "Klassisk brun mule", SIZES_FULL, 280, 619, "Brun"),
        ("Klassiker Slipper Brun", "Klassisk brun toffel", SIZES_FULL, 200, 449, "Brun"),
        ("Klassiker Slipper Svart", "Klassisk svart toffel", SIZES_FULL, 200, 449, "Svart"),
        ("Klassiker Ankle Boot Svart", "Klassisk svart ankelstövel", SIZES_FULL, 460, 1039, "Svart"),
        ("Klassiker Ankle Boot Brun", "Klassisk brun ankelstövel", SIZES_FULL, 460, 1039, "Brun"),
        ("Klassiker Knee Boot Svart", "Klassisk svart knästövel", SIZES_FULL, 520, 1169, "Svart"),
        ("Klassiker Knee Boot Brun", "Klassisk brun knästövel", SIZES_FULL, 520, 1169, "Brun"),
        ("Klassiker Rain Boot Svart", "Klassisk svart gummistövel", SIZES_FULL, 280, 629, "Svart"),
        ("Klassiker Rain Boot Marinblå", "Klassisk marinblå gummistövel", SIZES_FULL, 280, 629, "Marinblå"),
        ("Klassiker Work Boot Svart", "Klassisk svart arbetsstövel", SIZES_FULL, 480, 1079, "Svart"),
        ("Klassiker Work Boot Brun", "Klassisk brun arbetsstövel", SIZES_FULL, 480, 1079, "Brun"),
        ("Klassiker Dress Boot Svart", "Klassisk svart dressstövel", SIZES_FULL, 500, 1129, "Svart"),
        ("Klassiker Dress Boot Brun", "Klassisk brun dressstövel", SIZES_FULL, 500, 1129, "Brun"),
        ("Klassiker Jodhpur Svart", "Klassisk svart jodhpur", SIZES_FULL, 470, 1059, "Svart"),
        ("Klassiker Jodhpur Brun", "Klassisk brun jodhpur", SIZES_FULL, 470, 1059, "Brun"),
        ("Klassiker Riding Boot Svart", "Klassisk svart ridstövel", SIZES_FULL, 540, 1219, "Svart"),
        ("Klassiker Riding Boot Brun", "Klassisk brun ridstövel", SIZES_FULL, 540, 1219, "Brun"),
    ],
    "Sport": [
        ("Sport Runner Pro", "Professionell löparsneaker", SIZES_SPORT, 380, 849, "Svart"),
        ("Sport Runner Elite", "Elit löparsneaker", SIZES_SPORT, 420, 949, "Vit"),
        ("Sport Runner Ultra", "Ultra löparsneaker", SIZES_SPORT, 460, 1049, "Blå"),
        ("Sport Runner Speed", "Speed löparsneaker", SIZES_SPORT, 440, 989, "Röd"),
        ("Sport Runner Trail", "Trail löparsneaker", SIZES_SPORT, 400, 899, "Grön"),
        ("Sport Runner Road", "Road löparsneaker", SIZES_SPORT, 390, 879, "Grå"),
        ("Sport Runner Cross", "Cross löparsneaker", SIZES_SPORT, 370, 829, "Orange"),
        ("Sport Runner Tempo", "Tempo löparsneaker", SIZES_SPORT, 410, 929, "Gul"),
        ("Sport Runner Endurance", "Endurance löparsneaker", SIZES_SPORT, 430, 969, "Svart"),
        ("Sport Runner Stability", "Stability löparsneaker", SIZES_SPORT, 400, 899, "Blå"),
        ("Sport Basketball Pro", "Professionell basketsko", SIZES_SPORT, 450, 999, "Svart"),
        ("Sport Basketball Elite", "Elit basketsko", SIZES_SPORT, 480, 1079, "Vit"),
        ("Sport Basketball Low", "Låg basketsko", SIZES_SPORT, 400, 899, "Svart"),
        ("Sport Basketball High", "Hög basketsko", SIZES_SPORT, 430, 969, "Vit"),
        ("Sport Basketball Mid", "Mid basketsko", SIZES_SPORT, 415, 929, "Röd"),
        ("Sport Football Pro", "Professionell fotbollssko", SIZES_SPORT, 360, 799, "Svart"),
        ("Sport Football Elite", "Elit fotbollssko", SIZES_SPORT, 400, 899, "Vit"),
        ("Sport Football Indoor", "Inomhus fotbollssko", SIZES_SPORT, 320, 719, "Svart"),
        ("Sport Football Turf", "Turf fotbollssko", SIZES_SPORT, 340, 759, "Blå"),
        ("Sport Football Firm Ground", "Firm ground fotbollssko", SIZES_SPORT, 380, 849, "Röd"),
        ("Sport Tennis Pro", "Professionell tennissko", SIZES_SPORT, 370, 829, "Vit"),
        ("Sport Tennis Elite", "Elit tennissko", SIZES_SPORT, 400, 899, "Vit"),
        ("Sport Tennis Clay", "Clay tennissko", SIZES_SPORT, 380, 849, "Orange"),
        ("Sport Tennis Grass", "Grass tennissko", SIZES_SPORT, 380, 849, "Vit"),
        ("Sport Tennis Hard", "Hard court tennissko", SIZES_SPORT, 370, 829, "Blå"),
        ("Sport Training Pro", "Professionell träningssko", SIZES_SPORT, 350, 789, "Svart"),
        ("Sport Training Elite", "Elit träningssko", SIZES_SPORT, 380, 849, "Vit"),
        ("Sport Training Cross", "Cross träningssko", SIZES_SPORT, 360, 809, "Grå"),
        ("Sport Training Gym", "Gym träningssko", SIZES_SPORT, 340, 769, "Svart"),
        ("Sport Training HIIT", "HIIT träningssko", SIZES_SPORT, 370, 829, "Röd"),
        ("Sport Cycling Pro", "Professionell cykelsko", SIZES_SPORT, 420, 949, "Svart"),
        ("Sport Cycling Road", "Road cykelsko", SIZES_SPORT, 450, 1009, "Vit"),
        ("Sport Cycling MTB", "MTB cykelsko", SIZES_SPORT, 440, 989, "Svart"),
        ("Sport Cycling Spin", "Spin cykelsko", SIZES_SPORT, 380, 849, "Grå"),
        ("Sport Cycling Commute", "Commute cykelsko", SIZES_SPORT, 360, 809, "Svart"),
        ("Sport Hiking Pro", "Professionell vandringsko", SIZES_SPORT, 430, 969, "Brun"),
        ("Sport Hiking Elite", "Elit vandringsko", SIZES_SPORT, 460, 1039, "Grön"),
        ("Sport Hiking Low", "Låg vandringsko", SIZES_SPORT, 390, 879, "Brun"),
        ("Sport Hiking Mid", "Mid vandringsko", SIZES_SPORT, 420, 949, "Grå"),
        ("Sport Hiking High", "Hög vandringsko", SIZES_SPORT, 450, 1009, "Svart"),
        ("Sport Swimming Pro", "Professionell simsko", SIZES_SPORT, 180, 399, "Blå"),
        ("Sport Swimming Elite", "Elit simsko", SIZES_SPORT, 200, 449, "Svart"),
        ("Sport Aqua Shoe", "Vattensko", SIZES_SPORT, 160, 359, "Blå"),
        ("Sport Water Sandal", "Vattensandal", SIZES_SPORT, 140, 319, "Grå"),
        ("Sport Beach Shoe", "Strandsko", SIZES_SPORT, 150, 339, "Beige"),
        ("Sport Yoga Pro", "Professionell yogasko", SIZES_SPORT, 220, 499, "Lila"),
        ("Sport Yoga Elite", "Elit yogasko", SIZES_SPORT, 240, 539, "Rosa"),
        ("Sport Pilates Shoe", "Pilatessko", SIZES_SPORT, 210, 469, "Vit"),
        ("Sport Dance Pro", "Professionell danssko", SIZES_SPORT, 280, 629, "Svart"),
        ("Sport Dance Elite", "Elit danssko", SIZES_SPORT, 300, 669, "Svart"),
        ("Sport Martial Arts", "Kampsportssko", SIZES_SPORT, 260, 579, "Vit"),
        ("Sport Boxing Shoe", "Boxningssko", SIZES_SPORT, 290, 649, "Svart"),
        ("Sport Wrestling Shoe", "Brottningssko", SIZES_SPORT, 310, 699, "Röd"),
        ("Sport Climbing Shoe", "Klättersko", SIZES_SPORT, 350, 789, "Röd"),
        ("Sport Bouldering Shoe", "Boulderingsko", SIZES_SPORT, 370, 829, "Svart"),
        ("Sport Ski Boot", "Skidstövel", SIZES_SPORT, 500, 1129, "Svart"),
        ("Sport Snowboard Boot", "Snowboardstövel", SIZES_SPORT, 480, 1079, "Svart"),
        ("Sport Ice Skate", "Skridskosko", SIZES_SPORT, 420, 949, "Vit"),
        ("Sport Roller Skate", "Rullskridskosko", SIZES_SPORT, 380, 849, "Svart"),
        ("Sport Golf Shoe", "Golfsko", SIZES_SPORT, 390, 879, "Vit"),
    ],
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def seed_full_lager():
    """
    Seed the database with 240 shoe models (60 per category).
    Skips seeding if products already exist to avoid duplicates.
    """
    with get_db() as conn:
        existing = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if existing > 1:
            print(f"[SEED] Databasen innehåller redan {existing} produkter. Hoppar över seeding.")
            return

        print("[SEED] Startar seeding av 240 skomodeller...")
        total_products = 0
        total_variants = 0

        for category, products in CATALOGUE.items():
            for (name, description, sizes, purchase_price, selling_price, color) in products:
                # Insert product
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO products (name, category, description) VALUES (?, ?, ?)",
                    (name, category, description),
                )
                product_id = cursor.lastrowid
                total_products += 1

                for size in sizes:
                    # Build a deterministic SKU
                    clean_name = re.sub(r"[^a-zA-Z0-9]", "", name)[:6].upper()
                    clean_color = re.sub(r"[^a-zA-Z0-9]", "", color)[:3].upper()
                    clean_size = size.replace(".", "")
                    sku = f"LGR-{clean_name}-{clean_size}-{clean_color}"

                    stock = 3  # default stock per size

                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO variants
                            (product_id, sku, stock, size, color,
                             purchase_price, selling_price, original_price)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            product_id,
                            sku,
                            stock,
                            size,
                            color,
                            float(purchase_price),
                            float(selling_price),
                            float(selling_price),
                        ),
                    )
                    variant_id = cursor.lastrowid

                    if variant_id and stock > 0:
                        cursor.execute(
                            """
                            INSERT INTO transactions
                                (variant_id, type, quantity, purchase_price, selling_price)
                            VALUES (?, 'purchase', ?, ?, ?)
                            """,
                            (variant_id, stock, float(purchase_price), float(selling_price)),
                        )
                        total_variants += 1

        conn.commit()
        print(
            f"[SEED] Klar! {total_products} produkter och {total_variants} varianter "
            f"har lagts till i databasen."
        )


if __name__ == "__main__":
    seed_full_lager()
