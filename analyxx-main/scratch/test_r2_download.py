import urllib.request

url = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers/rtu-1styear/Sem%201/Basic%20Civil%20Engineering%202025.pdf"

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    with urllib.request.urlopen(req) as response:
        body = response.read()
        print("Success! Downloaded", len(body), "bytes via urllib with User-Agent.")
except Exception as e:
    print("Error:", e)
