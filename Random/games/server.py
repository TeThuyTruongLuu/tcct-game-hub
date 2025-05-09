from flask import Flask, request, jsonify, send_from_directory, make_response
import os
from ebooklib import epub

app = Flask(__name__)

# Middleware để thêm header CORS cho mọi yêu cầu
@app.after_request
def apply_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.route('/')
def home():
    return "✅ Server chạy ngon!"

@app.route('/api/epub', methods=['OPTIONS'])
def epub_options():
    return make_response('', 204)

@app.route('/api/epub', methods=['POST'])
def generate_epub():
    try:
        data = request.get_json()  # Lấy dữ liệu JSON từ request
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

        # Sử dụng thư mục tạm thời của hệ thống
        output_dir = '/tmp' if os.path.exists('/tmp') else os.getcwd()
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f'{title}.epub')
        epub.write_epub(output_path, book)

        return jsonify({'download_url': f'/download/{title}.epub'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        output_dir = '/tmp' if os.path.exists('/tmp') else os.getcwd()
        return send_from_directory(output_dir, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': 'File không tồn tại'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)