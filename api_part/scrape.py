import requests
import time
from multiprocessing import Pool, Manager
from itertools import product

# Replace with your actual WAQI API token
TOKEN = "b44f973b22e433b3dfb1e4bc10e43a9b3653e7d4"
LAT_STEP = 10
LON_STEP = 10
REQUESTS_PER_SECOND = 1  # Conservative rate limit (adjust if known)

def fetch_stations(args):
    bounds, all_stations, request_counter, lock = args
    url = f"https://api.waqi.info/map/bounds/?latlng={bounds}&token={TOKEN}"
    try:
        # Rate limiting with a shared counter
        with lock:
            current_time = time.time()
            if request_counter[0] >= REQUESTS_PER_SECOND:
                sleep_time = 1 - (current_time - request_counter[1])
                if sleep_time > 0:
                    time.sleep(sleep_time)
            request_counter[0] = 0
            request_counter[1] = time.time()

        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if data.get("status") == "ok" and isinstance(data.get("data"), list):
            stations = [str(station["uid"]) for station in data["data"]]  # Retrieve station IDs
            with lock:
                all_stations.extend(stations)  # Append to shared list
                request_counter[0] += 1
            print(f"Bounds {bounds}: Added {len(stations)} stations (Total: {len(all_stations)})")
        else:
            print(f"Bounds {bounds}: No data or invalid response")
    except requests.RequestException as e:
        print(f"Error fetching {bounds}: {e}")

def main():
    manager = Manager()
    all_stations = manager.list()  # Shared list across processes
    request_counter = manager.list([0, time.time()])  # [count, last_reset_time]
    lock = manager.Lock()  # For synchronizing access

    # Generate all bounding boxes
    lat_ranges = [(lat_min, lat_min + LAT_STEP) for lat_min in range(-90, 90, LAT_STEP)]
    lon_ranges = [(lon_min, lon_min + LON_STEP) for lon_min in range(-180, 180, LON_STEP)]
    bounds_list = [f"{lat_min},{lon_min},{lat_max},{lon_max}" 
                   for (lat_min, lat_max), (lon_min, lon_max) in product(lat_ranges, lon_ranges)]

    total_requests = len(bounds_list)
    print(f"Total bounding boxes to process: {total_requests}")

    # Use 5 cores
    with Pool(processes=5) as pool:
        pool.map(fetch_stations, [(bounds, all_stations, request_counter, lock) for bounds in bounds_list])

    # Convert to set to remove duplicates and save
    unique_stations = set(all_stations)
    with open("stations.txt", "w", encoding="utf-8") as file:
        file.write("\n".join(sorted(unique_stations)))
    print(f"Finished! Total unique stations retrieved: {len(unique_stations)} after {total_requests} requests")

if __name__ == "__main__":
    main()
