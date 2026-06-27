# -*- coding: utf-8 -*-
import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

count_cat = 0
count_html = 0

for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'catalogue.js':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            new_content = content.replace(
                '<button class="card-pill" data-group="size" data-val=\'3"×3"\'>3"×3"</button>',
                '<button class="card-pill active" data-group="size" data-val=\'3"×3"\'>3"×3"</button>'
            ).replace(
                '<button class="card-pill active" data-group="size" data-val=\'5"×5"\'>5"×5"</button>',
                '<button class="card-pill" data-group="size" data-val=\'5"×5"\'>5"×5"</button>'
            )
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count_cat += 1
                
        elif f == 'index.html':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            new_content = content.replace(
                '<button class="card-pill" data-group="size" data-val=\'3"×3"\'>3"×3"</button>',
                '<button class="card-pill active" data-group="size" data-val=\'3"×3"\'>3"×3"</button>'
            ).replace(
                '<button class="card-pill active" data-group="size" data-val=\'5"×5"\'>5"×5"</button>',
                '<button class="card-pill" data-group="size" data-val=\'5"×5"\'>5"×5"</button>'
            )
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count_html += 1

print(f'Updated catalogue.js in {count_cat} files.')
print(f'Updated index.html in {count_html} files.')
