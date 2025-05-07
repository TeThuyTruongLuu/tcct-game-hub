from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Cho phép CORS toàn bộ API

@app.route('/')
def home():
    return "✅ Server chạy ngon!"

@app.route('/api/epub', methods=['POST'])
def generate_epub():
    try:
        data = request.json
        title = data.get('title', 'Truyen Khong Ten')
        chapters = data.get('chapters', [])

        if not chapters:
            return jsonify({'error': 'Không có chương nào'}), 400

        from ebooklib import epub

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

        return jsonify({'download_url': f'/download/{title}.epub'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    return app.send_static_file(os.path.join('..', 'tmp', filename))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
