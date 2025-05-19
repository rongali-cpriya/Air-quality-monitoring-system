import requests
import boto3
from botocore import UNSIGNED
from botocore.config import Config
import os


def get_all_locations(country, api_key):
    """
    Fetches all location IDs for a given country using the OpenAQ API with pagination.

    Args:
        country (str): Country code (e.g., 'IN' for India).
        api_key (str): OpenAQ API key for authentication.

    Returns:
        list: List of location dictionaries containing IDs and metadata.
    """
    url = f'https://api.openaq.org/v3/locations?country={country}'
    headers = {"X-API-Key": api_key}
    locations = []
    page = 1

    while True:
        response = requests.get(url, params={'page': page}, headers=headers)
        if response.status_code != 200:
            print(f"API request failed with status {response.status_code}: {response.text}")
            break
        data = response.json()
        locations.extend(data['results'])
        if page >= data['meta']['pages']:
            break
        page += 1
    return locations


# Step 1: Retrieve API key from environment variable
api_key = os.environ.get("OPENAQ_API_KEY")
if not api_key:
    print("Error: API key not found. Please set the 'OPENAQ_API_KEY' environment variable.")
    exit(1)

# Step 2: Fetch all location IDs for India
country = 'IN'
print(f"Fetching location IDs for {country}...")
locations = get_all_locations(country, api_key)
if not locations:
    print("No locations found for India. Check the API key, network connection, or API status.")
    exit(1)
location_ids = [loc['id'] for loc in locations]
print(f"Found {len(location_ids)} locations in India.")

# Step 3: Set up S3 client with anonymous access
s3 = boto3.client('s3', config=Config(signature_version=UNSIGNED))
bucket_name = 'openaq-data-archive'

# Step 4: Define years and local directory
years = ['2023', '2024', '2025']  # Note: 2025 data won’t exist yet
local_dir = 'data'
print(f"Downloading data to {local_dir}/")

# Step 5: Download daily files for each location ID and year
for location_id in location_ids:
    for year in years:
        prefix = f'records/csv.gz/locationid={location_id}/year={year}/'
        try:
            response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
            if 'Contents' not in response:
                print(f"No data found for location {location_id}, year {year}")
                continue
            for obj in response['Contents']:
                key = obj['Key']
                # Replace '/' with '_' to flatten the directory structure
                local_file = os.path.join(local_dir, key.replace('/', '_'))
                os.makedirs(os.path.dirname(local_file), exist_ok=True)
                s3.download_file(bucket_name, key, local_file)
                print(f"Downloaded {key} to {local_file}")
        except Exception as e:
            print(f"Error downloading for location {location_id}, year {year}: {e}")