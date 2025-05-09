from flask import Flask, jsonify, request, send_from_directory, make_response
from flask_cors import CORS
import os
from ebooklib import epub
import logging
import tempfile

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'the quick brown fox jumps over the lazy dog'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Cấu hình CORS: Cho phép tất cả origin và phương thức cho /api/*
CORS(app, resources={r"/api/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization"], "methods": ["GET", "POST", "OPTIONS"]}})

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Global error: {str(e)}", exc_info=True)
    response = jsonify({'error': 'Lỗi server nội bộ', 'details': str(e)})
    response.status_code = 500
    return response

@app.route("/")
def hello():
    app.logger.info("Root route accessed")
    return "✅ API running ngon lành!"

@app.route('/api/epub', methods=['POST', 'OPTIONS'])
def epub_handler():
    app.logger.info(f"Received {request.method} request at /api/epub")
    if request.method == 'OPTIONS':
        app.logger.info("Handling OPTIONS request")
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
        response.status_code = 204
        return response

    try:
        app.logger.info("Processing POST request data")
        data = request.get_json()
        if not data:
            app.logger.warning("No JSON data received")
            return jsonify({'error': 'Không có dữ liệu JSON'}), 400
        
        title = data.get('title', 'Truyen Khong Ten')
        chapters = data.get('chapters', [])
        if not chapters:
            app.logger.warning("No chapters provided")
            return jsonify({'error': 'Không có chương nào'}), 400

        book = epub.EpubBook()
        book.set_title(title)
        book.set_language('vi')

        epub_chapters = []
        for idx, chapter in enumerate(chapters, 1):
            chap_title = chapter.get('title', f'Chương {idx}')
            chap_content = chapter.get('content', '')
            c = epub.EpubHtml(title=chap_title, file_name=f'chap_{idx}.xhtml', lang='vi')
            c.content = f'<h1>{chap_title}</h1><p>{chap_content.replace("\n", "<br/>")}</p>'
            book.add_item(c)
            epub_chapters.append(c)

        book.toc = tuple(epub_chapters)
        book.add_item(epub.EpubNavi())
        book.add_item(epub.EpubNCX())
        book.spine = ['nav'] + epub_chapters

        # Sử dụng tempfile để đảm bảo vị trí ghi file hợp lệ
        with tempfile.NamedTemporaryFile(delete=False, suffix='.epub') as temp_file:
            output_path = temp_file.name
            app.logger.info(f"Writing EPUB to {output_path}")
            epub.write_epub(output_path, book)

        download_url = f'/download/{os.path.basename(output_path)}'
        app.logger.info(f"Returning download URL: {download_url}")
        return jsonify({'download_url': download_url})

    except Exception as e:
        app.logger.error(f"Lỗi tạo EPUB: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        app.logger.info(f"Attempting to send file: {filename}")
        return send_from_directory(tempfile.gettempdir(), filename, as_attachment=True)
    except Exception as e:
        app.logger.error(f"Lỗi tải file: {str(e)}", exc_info=True)
        return jsonify({'error': 'Không tìm thấy file'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.logger.info(f"Starting app on host=0.0.0.0, port={port}")
    app.run(host='0.0.0.0', port=port, debug=True)