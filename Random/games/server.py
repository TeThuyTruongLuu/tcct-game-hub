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

# Áp dụng CORS với điều kiện
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Middleware để thêm header có điều kiện
@app.after_request
def apply_cors_headers(response):
    app.logger.debug(f"Applying CORS to response: {response.status}")
    # Chỉ thêm header nếu là yêu cầu từ domain khác
    if request.method in ['OPTIONS', 'POST', 'GET'] and 'Origin' in request.headers:
        response.headers['Access-Control-Allow-Origin'] = request.headers['Origin']
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
    return response

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

            output_path = os.path.join('/tmp', f'{title}.epub')
            epub.write_epub(output_path, book)

            response = jsonify({'download_url': f'/download/{title}.epub'})
            return apply_cors_headers(response)
        except Exception as e:
            app.logger.error(f"Error: {str(e)}")
            response = jsonify({'error': str(e)})
            return apply_cors_headers(response), 500

@app.route('/download/<filename>')
def download_file(filename):
    response = send_from_directory('/tmp', filename, as_attachment=True)
    return apply_cors_headers(response)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)