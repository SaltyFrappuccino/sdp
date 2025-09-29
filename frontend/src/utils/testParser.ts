import { MarkdownHandbookParser } from './markdownHandbookParser';

async function testParser() {
  console.log('Testing Markdown Parser...');

  try {
    // Загружаем все главы
    console.log('Loading main handbook file...');
    const handbookData = await MarkdownHandbookParser.loadAllChapters();
    console.log('Loaded handbook data:', handbookData);

    // Проверяем структуру
    Object.entries(handbookData).forEach(([category, sections]) => {
      console.log(`Category "${category}": ${sections.length} sections`);
      sections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section.title} (${section.id})`);
        if (section.content.subsections) {
          console.log(`    - Has ${section.content.subsections.length} subsections`);
          section.content.subsections.forEach((sub, subIndex) => {
            console.log(`      ${subIndex + 1}. ${sub.title} (${sub.id})`);
          });
        }
      });
    });

    // Загружаем конкретную главу (теперь это просто перезагрузка основного файла)
    console.log('\nTesting loadChapter function...');
    const chapterData = await MarkdownHandbookParser.loadChapter('Руководство_по_Миру.md');
    console.log('Chapter loaded:', chapterData.length, 'sections');

  } catch (error) {
    console.error('Error testing parser:', error);
  }
}

// Запускаем тест только если файл запущен напрямую
if (typeof window !== 'undefined' && window.location) {
  // В браузере
  testParser();
} else {
  // В Node.js
  testParser();
}
