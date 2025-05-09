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

# Bật CORS cho toàn bộ API
CORS(app)

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Global error: {str(e)}")
    response = jsonify({'error': 'Lỗi server nội bộ', 'details': str(e)})
    response.status_code = 500
    return response

@app.route("/")
def hello():
    return "✅ API running ngon lành!"

@app.route('/api/epub', methods=['POST', 'OPTIONS'])
def epub_handler():
    if request.method == 'OPTIONS':
        # Preflight request
        response = make_response()
        response.status_code = 204
        return response

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Không có dữ liệu JSON'}), 400

        title = data.get('title', 'Truyen Khong Ten')
        chapters = data.get('chapters', [])
        if not chapters:
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

        with tempfile.NamedTemporaryFile(delete=False, suffix='.epub') as temp_file:
            output_path = temp_file.name
            epub.write_epub(output_path, book)

        response = jsonify({'download_url': f'/download/{os.path.basename(output_path)}'})
        return response

    except Exception as e:
        app.logger.error(f"Lỗi tạo EPUB: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        return send_from_directory(tempfile.gettempdir(), filename, as_attachment=True)
    except Exception as e:
        app.logger.error(f"Lỗi tải file: {str(e)}")
        return jsonify({'error': 'Không tìm thấy file'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
