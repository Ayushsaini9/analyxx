with open("scratch/download_page.html") as f:
    html = f.read()

# Let's find lines containing "19318"
lines = html.splitlines()
for i, line in enumerate(lines):
    if "19318" in line:
        print(f"Line {i+1}: {line.strip()}")
