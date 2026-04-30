import os
import json



SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

ROOT_DIR = os.path.dirname(SCRIPT_DIR)


CONTENT_DIR = os.path.join(ROOT_DIR, 'src', 'preset', 'content')
STYLE_DIR = os.path.join(ROOT_DIR, 'src', 'preset', 'style')
OUTPUT_FILE = os.path.join(ROOT_DIR, 'src', 'preset', 'presets.json')


VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

def get_images(directory):
    if not os.path.exists(directory):
        print(f"⚠️ Warning: Directory not found -> {directory}")
        return []
    

    files = [f for f in os.listdir(directory) if os.path.splitext(f)[1].lower() in VALID_EXTENSIONS]

    files.sort()
    return files

def main():
    print("🔍 Scanning preset folders...")
    
    preset_config = {
        "content": get_images(CONTENT_DIR),
        "style": get_images(STYLE_DIR)
    }
    

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(preset_config, f, indent=4)
        
    print(f"✅ Successfully updated: src/preset/presets.json")
    print(f"📁 Found {len(preset_config['content'])} content images and {len(preset_config['style'])} style images.")

if __name__ == '__main__':
    main()