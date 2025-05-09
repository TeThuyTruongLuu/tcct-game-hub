from flask import Flask, jsonify, make_response, request, send_from_directory
from flask_cors import CORS
import os
from ebooklib import epub
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'the quick brown fox jumps over the lazy dog'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def apply_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Global error: {str(e)}")
    response = jsonify({'error': 'Lỗi server nội bộ'})
    response.status_code = 500
    return apply_cors_headers(response)

@app.route("/")
def hello():
    return "✅ API running ngon lành!"

@app.route('/api/epub', methods=['OPTIONS', 'POST'])
def epub_handler():
    if request.method == 'OPTIONS':
        return apply_cors_headers(make_response('', 204))

    try:
        data = request.get_json()
        if not data:
            return apply_cors_headers(jsonify({'error': 'Không có dữ liệu JSON'})), 400
        
        title = data.get('title', 'Truyen Khong Ten')
        chapters = data.get('chapters', [])
        if not chapters:
            return apply_cors_headers(jsonify({'error': 'Không có chương nào'})), 400

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

        output_path = os.path.join('/tmp', f'{title}.epub')
        epub.write_epub(output_path, book)

        return apply_cors_headers(jsonify({'download_url': f'/download/{title}.epub'}))

    except Exception as e:
        app.logger.error(f"Lỗi tạo EPUB: {str(e)}")
        return apply_cors_headers(jsonify({'error': str(e)})), 500

@app.route('/download/<filename>')
def download_file(filename):
    return apply_cors_headers(
        send_from_directory('/tmp', filename, as_attachment=True)
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
