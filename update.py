import os

frontend_dir = r'c:\Users\awast\OneDrive\Desktop\Stocknest\frontend'
backend_url = 'https://stocknest-rpcw.onrender.com'

files_to_update = [
    'script.js',
    'dashboard.js',
    'inventory.js',
    'maintainance.js',
    'signup.js',
    'login.js',
    'profile.html',
    'components/topbar.js'
]

for file in files_to_update:
    filepath = os.path.join(frontend_dir, file.replace('/', '\\\\'))
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Special case for login.js
        if file == 'login.js':
            content = content.replace(
                "const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\n    ? 'http://localhost:5000'\n    : '';",
                f"const API_BASE_URL = '{backend_url}';"
            )
            content = content.replace(
                "const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\r\n    ? 'http://localhost:5000'\r\n    : '';",
                f"const API_BASE_URL = '{backend_url}';"
            )
        
        # General replacement for everything else
        content = content.replace('http://localhost:5000', backend_url)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {file}')
    else:
        print(f'File not found: {file}')

# Update backend env
env_path = r'c:\Users\awast\OneDrive\Desktop\Stocknest\backend\.env'
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        env_content = f.read()
    env_content = env_content.replace('db.csnnhqwkjpfhaqiffoel.supabase.co', 'aws-0-ap-southeast-2.pooler.supabase.com')
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(env_content)
    print("Updated .env")
