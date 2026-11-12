'use strict';
// One catalog is the source of truth for all grade/subject/unit files.
window.loadQuestionBank = async function () {
  async function read(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`問題データを読み込めません（${path}）`);
    return response.json();
  }
  const catalog = await read('data/catalog.json');
  if (catalog.version !== 1 || !Array.isArray(catalog.units)) throw new Error('単元一覧の形式が違います');
  const loaded = await Promise.all(catalog.units.map(async unit => {
    if (!unit.file) return [];
    const url = new URL(unit.file, new URL('data/', location.href));
    const root = new URL('data/questions/', location.href);
    if (!url.href.startsWith(root.href)) throw new Error('問題ファイルのパスが不正です');
    const questions = await read(url.href);
    if (!Array.isArray(questions) || questions.some(q =>
      `${q.subject}|${q.grade}|${q.unit}` !== unit.key || !q.id ||
      !['basic', 'standard', 'advanced'].includes(q.difficulty) ||
      !Array.isArray(q.options) || q.options.length !== 4 ||
      !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length ||
      !Array.isArray(q.prereq)
    )) throw new Error(`問題形式が違います（${unit.unit}）`);
    return questions;
  }));
  const questions = loaded.flat();
  if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error('問題IDが重複しています');
  return {catalog, questions};
};
