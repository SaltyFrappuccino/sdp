import re
import logging
from core.utils import send_message

# Кэш для данных справочника, чтобы не читать файл каждый раз
_handbook_data = None
HANDBOOK_FILE_PATH = '../frontend/src/panels/Handbook.tsx'

def parse_handbook_tsx(file_path: str):
    """
    Парсит TSX файл и извлекает структурированные данные из переменной 'sections'.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        logging.error(f"Файл справочника не найден по пути: {file_path}")
        return None

    match = re.search(r'const sections = (\[[\s\S]*?\]);', content, re.DOTALL)
    if not match:
        logging.error("Не удалось найти массив 'sections' в файле справочника.")
        return None
    
    js_array_string = match.group(1)
    sections_data = []
    section_objects_str = re.split(r'(?<=}),\s*(?={)', js_array_string.strip('[]\n'))

    for obj_str in section_objects_str:
        if not obj_str.strip():
            continue
            
        section = {}
        id_match = re.search(r"id:\s*'(.*?)'", obj_str)
        title_match = re.search(r"title:\s*'(.*?)'", obj_str)
        category_match = re.search(r"category:\s*'(.*?)'", obj_str)
        content_match = re.search(r'content:\s*\{([\s\S]*)\}', obj_str, re.DOTALL)

        if id_match: section['id'] = id_match.group(1)
        if title_match: section['title'] = title_match.group(1)
        if category_match: section['category'] = category_match.group(1)

        if content_match:
            content_str = content_match.group(1)
            content = {}
            c_title_match = re.search(r"title:\s*'(.*?)'", content_str)
            c_desc_match = re.search(r"description:\s*'(.*?)'", content_str)
            
            kp_match = re.search(r'keyPoints:\s*\[([^\]]*)\]', content_str, re.DOTALL)
            if kp_match:
                points_str = kp_match.group(1)
                points = [p.strip().strip("'\"") for p in points_str.split(',') if p.strip()]
                content['keyPoints'] = points
            
            dc_match = re.search(r'detailedContent:\s*`([\s\S]*)`', content_str, re.DOTALL)
            if dc_match:
                content['detailedContent'] = dc_match.group(1).strip()

            if c_title_match: content['title'] = c_title_match.group(1)
            if c_desc_match: content['description'] = c_desc_match.group(1)
            section['content'] = content

        if all(k in section for k in ['id', 'title', 'content']):
             sections_data.append(section)

    return sections_data

def get_handbook_data():
    """Возвращает данные справочника, используя кэш."""
    global _handbook_data
    if _handbook_data is None:
        _handbook_data = parse_handbook_tsx(HANDBOOK_FILE_PATH)
    return _handbook_data

def parse_detailed_content(text: str) -> dict:
    """Парсит подробное описание на подсекции по заголовкам '###'."""
    subsections = {}
    chunks = re.split(r'\n### ', text)
    if len(chunks) < 2:
        return {}

    for chunk in chunks[1:]:
        lines = chunk.split('\n')
        title = lines[0].strip()
        content = '\n'.join(lines[1:]).strip()
        subsections[title] = content
    return subsections

def search_in_handbook(query: str):
    """
    Ищет наиболее релевантную секцию (и подсекцию) в справочнике.
    Возвращает кортеж (секция, подзаголовок, контент подсекции) или (None, None, None).
    """
    data = get_handbook_data()
    if not data:
        return None, None, None

    query_words = set(re.findall(r'\w+', query.lower()))
    best_section_score = 0
    best_section = None

    # Этап 1: Найти лучшую СЕКЦИЮ
    for section in data:
        score = 0
        content = section.get('content', {})
        
        # Заголовки (вес 10)
        title_words = set(re.findall(r'\w+', section.get('title', '').lower()))
        score += 10 * len(query_words.intersection(title_words))
        content_title_words = set(re.findall(r'\w+', content.get('title', '').lower()))
        score += 10 * len(query_words.intersection(content_title_words))

        # Ключевые моменты (вес 7)
        key_points_text = ' '.join(content.get('keyPoints', [])).lower()
        key_points_words = set(re.findall(r'\w+', key_points_text))
        score += 7 * len(query_words.intersection(key_points_words))

        # Описание (вес 3)
        desc_words = set(re.findall(r'\w+', content.get('description', '').lower()))
        score += 3 * len(query_words.intersection(desc_words))

        # Полный текст (вес 1 за слово, 15 за фразу)
        detailed_text = content.get('detailedContent', '').lower()
        if query.lower() in detailed_text:
            score += 15
        detailed_words = set(re.findall(r'\w+', detailed_text))
        score += 1 * len(query_words.intersection(detailed_words))

        if score > best_section_score:
            best_section_score = score
            best_section = section

    # Этап 2: Если секция найдена, ищем лучшую ПОДСЕКЦИЮ внутри нее
    if best_section and best_section_score > 4:
        content = best_section.get('content', {})
        detailed_content_text = content.get('detailedContent')

        if detailed_content_text:
            subsections = parse_detailed_content(detailed_content_text)
            best_subsection_score = 0
            best_subsection_title = None
            best_subsection_content = None

            for sub_title, sub_content in subsections.items():
                sub_score = 0
                # Очень высокий вес за прямое совпадение с подзаголовком
                if query.lower() in sub_title.lower():
                    sub_score += 50
                
                sub_title_words = set(re.findall(r'\w+', sub_title.lower()))
                sub_score += 20 * len(query_words.intersection(sub_title_words))

                if sub_score > best_subsection_score:
                    best_subsection_score = sub_score
                    best_subsection_title = sub_title
                    best_subsection_content = sub_content
            
            # Если нашли подходящую подсекцию, возвращаем ее
            if best_subsection_score > 20:
                return best_section, best_subsection_title, best_subsection_content

        # Если подсекцию не нашли, возвращаем основную секцию
        return best_section, None, None

    return None, None, None

def format_section_for_vk(section, subsection_title=None, subsection_content=None):
    """Форматирует найденную секцию (или подсекцию) в красивое сообщение для VK."""
    
    if subsection_title and subsection_content:
        message = f"📘 Справочник: {subsection_title}\n\n"
        
        first_paragraph = subsection_content.split('\n\n')[0]
        summary = first_paragraph.strip()

        if len(summary) > 500:
            end_pos = summary.rfind('.', 0, 500)
            summary = summary[:end_pos + 1] if end_pos != -1 else summary[:500] + '...'

        summary = re.sub(r'####\s*', '🔸 ', summary)
        summary = re.sub(r'[\*_]', '', summary)
        summary = re.sub(r'-\s', '🔹 ', summary)
        
        message += summary
        message += f"\n\n(Найдено в разделе: «{section.get('title', 'N/A')}»)"
        return message

    content = section.get('content', {})
    title = content.get('title', section.get('title', 'Без названия'))
    description = content.get('description', '')
    key_points = content.get('keyPoints', [])

    message = f"📘 Справочник: {title}\n\n"
    if description:
        message += f"▪ {description}\n\n"

    if key_points:
        message += "Ключевые моменты:\n"
        for point in key_points[:7]:
            message += f"🔹 {point}\n"
    
    message += f"\n(Найдено в разделе: «{section.get('title', 'N/A')}»)"
    return message

def handbook_command(vk, event, args):
    """Ищет информацию в справочнике."""
    query = " ".join(args).strip()
    if not query:
        send_message(vk, event.peer_id, "📝 Пожалуйста, укажите, что вы хотите найти в справочнике.")
        return
        
    # Предварительная загрузка данных, если они еще не загружены
    if get_handbook_data() is None:
        send_message(vk, event.peer_id, "⏳ Первый запуск, индексирую справочник... Это может занять несколько секунд.")
    
    # Поиск
    result_section, sub_title, sub_content = search_in_handbook(query)
    
    if result_section:
        result_message = format_section_for_vk(result_section, sub_title, sub_content)
    else:
        result_message = f"ℹ️ По вашему запросу «{query}» ничего не найдено в справочнике. Попробуйте использовать другие ключевые слова."

    send_message(vk, event.peer_id, result_message)
