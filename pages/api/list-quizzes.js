import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const quizDirName = 'list quizzes';
    const quizDirectory = path.join(process.cwd(), 'public', quizDirName);
    const folder = req.query.folder || '';

    let currentPath = quizDirectory;
    if (folder) {
      const resolved = path.resolve(quizDirectory, folder);
      if (!resolved.startsWith(quizDirectory)) {
        return res.status(500).send('Error reading directory');
      }
      currentPath = resolved;
    }

    if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isDirectory()) {
      console.error(`Path does not exist or is not a directory: ${currentPath}`);
      return res.status(500).send('Error reading directory');
    }

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith('.txt'))
      .map((e) => e.name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    res.status(200).json({ folders, files });
  } catch (err) {
    console.error('Error reading directory:', err);
    res.status(500).send('Error reading directory');
  }
}
