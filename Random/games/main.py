from flask import Flask, jsonify, make_response, request, send_from_directory
from flask_cors import CORS
import os
import epub
import logging

# Cấu hình logging
logging.basicConfig(level=logging.DEBUG)
app = Flask(__name__)
app.config['SECRET_KEY'] = 'the quick brown fox jumps over the lazy dog'
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Giới hạn 16MB

# Áp dụng CORS
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Middleware để thêm header CORS
@app.after_request
def apply_cors_headers(response):
    app.logger.debug(f"Applying CORS to response with status: {response.status}")
    app.logger.debug(f"Headers before: {dict(response.headers)}")
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Max-Age'] = '3600'
    app.logger.debug(f"Headers after: {dict(response.headers)}")
    return response

# Xử lý lỗi toàn cục
@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Global error: {str(e)}")
    response = jsonify({'error': 'Lỗi server nội bộ'})
    response.status_code = 500
    return apply_cors_headers(response)

@app.route("/")
def helloWorld():
    app.logger.debug(f"SECRET_KEY: {app.config['SECRET_KEY']}")
    return "Hello, cross-origin-world!"

@app.route('/api/epub', methods=['OPTIONS', 'POST'])
def epub_handler():
    app.logger.debug(f"Received request: {request.method} {request.url} {request.headers}")
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        return apply_cors_headers(response)
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                response = jsonify({'error': 'Không có dữ liệu JSON'})
                return apply_cors_headers(response), 400
            
            title = data.get('title', 'Truyen Khong Ten')
            chapters = data.get('chapters', [])
            if not chapters:
                response = jsonify({'error': 'Không có chương nào'})
                return apply_cors_headers(response), 400

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

            output_path = os.path.join(os.getcwd(), 'tmp', f'{title}.epub')
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            if not os.access(os.path.dirname(output_path), os.W_OK):
                app.logger.error(f"No write permission for {os.path.dirname(output_path)}")
                response = jsonify({'error': 'Không có quyền ghi file'})
                return apply_cors_headers(response), 500

            try:
                with open(output_path, 'w') as f:
                    pass
            except Exception as e:
                app.logger.error(f"Cannot write to {output_path}: {str(e)}")
                response = jsonify({'error': f'Không thể ghi file: {str(e)}'})
                return apply_cors_headers(response), 500

            try:
                epub.write_epub(output_path, book, options={'encoding': 'utf-8'})
            except Exception as e:
                app.logger.error(f"EPUB write error: {str(e)}")
                response = jsonify({'error': f'Lỗi tạo EPUB: {str(e)}'})
                return apply_cors_headers(response), 500

            response = jsonify({'download_url': f'/download/{title}.epub'})
            return apply_cors_headers(response)
        except Exception as e:
            app.logger.error(f"Error: {str(e)}")
            response = jsonify({'error': str(e)})
            return apply_cors_headers(response), 500

@app.route('/download/<filename>')
def download_file(filename):
    response = send_from_directory(os.path.join(os.getcwd(), 'tmp'), filename, as_attachment=True)
    return apply_cors_headers(response)

if __name__ == '__main__':
    port