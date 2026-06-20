import os
import hashlib
from datetime import datetime
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

IMAGE_ROOT_DIR = r"D:\Game\tcct-game-hub\www\collections\Goods"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def generate_card_id(relative_path):
    hash_object = hashlib.md5(relative_path.encode("utf-8"))
    return "card_" + hash_object.hexdigest()[:16]

def scan_and_seed_database():
    cards_collection = db.collection("goods_cards")
    batch = db.batch()
    count = 0

    for root, dirs, files in os.walk(IMAGE_ROOT_DIR):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue

            full_path = os.path.join(root, file)
            relative_path = os.path.relpath(full_path, IMAGE_ROOT_DIR)
            
            path_parts = relative_path.split(os.sep)
            
            folder_parts = path_parts[:-1]
            if folder_parts:
                collection_name = " ❯ ".join([part.replace("_", " ").title() for part in folder_parts])
            else:
                collection_name = "Khác"

            card_name = os.path.splitext(file)[0].replace("_", " ")
            card_id = generate_card_id(relative_path)
            app_assets_path = "collections/Goods/" + relative_path.replace(os.sep, "/")

            card_data = {
                "card_id": card_id,
                "card_name": card_name.title(),
                "collection_name": collection_name,
                "rarity": "Normal",
                "reference_image_url": app_assets_path,
                "is_owned": False,
                "obtained_method": None,
                "user_note": "",
                "real_photo_url": "",
                "local_photo_uri": "",
                "need_sync_photo": False,
                "updated_at": None
            }

            doc_ref = cards_collection.document(card_id)
            batch.set(doc_ref, card_data, merge=True)
            count += 1

            if count % 500 == 0:
                batch.commit()
                batch = db.batch()

    if count % 500 != 0:
        batch.commit()

scan_and_seed_database()