import psycopg2

# Database connection details
DATABASE_URL = "postgresql://postgres:TSPranav123@localhost:5432/aqi_db"

# List of 200 facts with emojis
facts = [
    "🌍 Earth has lost 50% of its wildlife in the last 40 years due to human activities.",
    "🌲 One large tree can provide oxygen for up to four people every day!",
    "💨 Air pollution causes about 7 million deaths worldwide every year.",
    "🌞 The sun is 109 times wider than Earth and emits solar energy that influences our climate.",
    "💧 97% of the Earth's water is salty; only 3% is freshwater, and just 1% is accessible for drinking.",
    "🌪️ Tornadoes can have wind speeds up to 300 mph, making them one of the most violent weather events.",
    "🍀 Spending just 20 minutes in nature reduces stress levels and improves mood.",
    "🔥 Wildfires are becoming more frequent due to global warming and human activities.",
    "🍂 Trees absorb carbon dioxide (CO₂) and release oxygen, improving air quality.",
    "💙 Drinking enough water daily helps maintain body temperature and proper organ function.",
    "⚡ Lightning is hotter than the surface of the sun, reaching up to 30,000°C (54,000°F)!",
    "🏥 Good hygiene practices can prevent 60% of common infections like colds and flu.",
    "🌾 Deforestation leads to soil erosion, reducing land fertility and harming agriculture.",
    "🐝 Bees are responsible for pollinating about 75% of all fruits and vegetables we eat! 🍎🍉",
    "🌡️ The Earth's average temperature has increased by 1.1°C since the pre-industrial era.",
    "💨 Trees filter pollutants like nitrogen oxides and sulfur dioxide, making air cleaner.",
    "🚶 Walking for just 30 minutes a day can reduce the risk of heart disease and obesity.",
    "🌎 The Amazon rainforest produces 20% of the world's oxygen supply.",
    "🏙️ Urban areas experience a heat island effect, where cities are hotter than rural areas due to concrete and asphalt.",
    "🔋 Switching to renewable energy sources like wind and solar can significantly reduce carbon emissions.",
    "💦 Every drop counts! A leaking faucet wastes about 3,000 gallons of water per year. 🚰",
    "🌻 Planting more trees in cities can reduce temperatures by up to 5°C during summer.",
    "🥗 Eating a balanced diet rich in fruits and vegetables boosts immunity and overall health.",
    "⛅ Clouds act as a natural sunscreen, reflecting sunlight away from Earth.",
    "🚴 Cycling instead of driving reduces CO₂ emissions and improves cardiovascular health. 🚲",
    "🦠 Washing hands with soap can prevent diseases like cholera, flu, and COVID-19.",
    "🌊 The ocean absorbs about 30% of the CO₂ produced by human activities, reducing global warming effects.",
    "🏕️ Spending time in green spaces is linked to lower rates of anxiety and depression.",
    "🌳 Urban forests can reduce noise pollution by up to 50%, creating calmer environments.",
    "🧴 Sunscreen protects against harmful UV rays, reducing the risk of skin cancer.",
    "🗑️ Recycling one aluminum can saves enough energy to run a TV for 3 hours.",
    "🌩️ A single bolt of lightning can contain up to 1 billion volts of electricity.",
    "❄️ The coldest temperature ever recorded on Earth was -128.6°F (-89.2°C) in Antarctica.",
    "🏋️ Regular exercise improves mental health by releasing endorphins, the 'happy hormones.'",
    "🍃 Air-purifying plants like snake plants and peace lilies can remove toxins from indoor air.",
    "🚗 Carpooling and public transport reduce carbon footprints and traffic congestion.",
    "🍎 Eating organic food reduces exposure to pesticides and supports sustainable farming.",
    "🔬 Microplastics are found in 90% of bottled water, affecting human and marine life.",
    "📱 Electronic waste (e-waste) is the fastest-growing waste problem worldwide.",
    "🏞️ National parks help preserve biodiversity and protect endangered species.",
    "🧘 Deep breathing exercises improve lung capacity and reduce stress levels.",
    "🍂 Composting reduces landfill waste and creates nutrient-rich soil for plants.",
    "🌡️ Climate change increases the frequency and intensity of hurricanes and heatwaves.",
    "🦜 Deforestation threatens over 1 million species, reducing biodiversity.",
    "💊 Antibiotic overuse leads to drug-resistant bacteria, making infections harder to treat.",
    "💚 Being in nature for 10 minutes lowers blood pressure and heart rate.",
    "🌏 Asia accounts for over 60% of global plastic pollution in oceans.",
    "🌠 The ozone layer protects us from harmful UV rays and is gradually recovering.",
    "🌪️ Hurricanes are named in alphabetical order based on a list maintained by the World Meteorological Organization.",
    "♻️ Recycling just one plastic bottle saves enough energy to power a light bulb for 3 hours.",
    "🏊 Swimming is a full-body workout that improves lung capacity and heart health.",
    "🔥 Methane is 25 times more potent than CO₂ in trapping heat in the atmosphere.",
    "🚰 Boiling water before drinking kills bacteria and prevents waterborne diseases.",
    "🌧️ Acid rain is caused by pollutants like sulfur dioxide and nitrogen oxides in the air.",
    "🏔️ The Himalayas are the youngest mountain range, still rising due to tectonic movements.",
    "🚀 Space pollution (debris) is becoming a growing concern for future space missions.",
    "🐘 Elephant populations are declining due to poaching and habitat destruction.",
    "🍵 Drinking green tea is linked to better metabolism and a lower risk of heart disease.",
    "🎋 Bamboo is the fastest-growing plant on Earth, reaching 3 feet per day!",
    "💚 Sustainable living habits, like reducing waste and conserving water, help protect our planet.",
]

# Connect to PostgreSQL and insert facts
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Create table if it doesn't exist
    cur.execute("""
        CREATE TABLE IF NOT EXISTS factsaqi (
            id SERIAL PRIMARY KEY,
            fact TEXT NOT NULL
        )
    """)

    # Insert facts into the table
    for fact in facts:
        cur.execute("INSERT INTO factsaqi (fact) VALUES (%s)", (fact,))

    # Commit changes
    conn.commit()
    print("✅ Successfully inserted facts into the database!")

except Exception as e:
    print("❌ Error:", e)

finally:
    cur.close()
    conn.close()
