// 构建脚本：将静态前端资源复制到 dist 目录（用于 Capacitor 打包）
// 说明：
// - 仅复制本项目根目录中的纯前端文件与资源目录，避免把原生工程一起复制进去
// - Windows/Unix 通用，使用 Node.js fs API 递归复制

const fs = require('fs');
const path = require('path');

/** 需要复制的文件/目录（相对项目根） */
const entriesToCopy = [
	'index.html',
	'config.html',
	'conversations.html',
	'style.css',
	'prompts.js',
	'logger.js',
	'script.js',
	'icon',
	'tools',
	'CURSOR.md',
	'README.md',
	'README_zh.md'
];

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');

/** 递归复制目录 */
function copyDir(srcDir, destDir) {
	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}
	const items = fs.readdirSync(srcDir, { withFileTypes: true });
	for (const item of items) {
		const srcPath = path.join(srcDir, item.name);
		const destPath = path.join(destDir, item.name);
		if (item.isDirectory()) {
			copyDir(srcPath, destPath);
		} else if (item.isFile()) {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/** 复制单个条目（文件或目录） */
function copyEntry(entry) {
	const srcPath = path.join(projectRoot, entry);
	const destPath = path.join(distDir, entry);
	if (!fs.existsSync(srcPath)) {
		return;
	}
	const stat = fs.statSync(srcPath);
	if (stat.isDirectory()) {
		copyDir(srcPath, destPath);
	} else if (stat.isFile()) {
		const parent = path.dirname(destPath);
		if (!fs.existsSync(parent)) {
			fs.mkdirSync(parent, { recursive: true });
		}
		fs.copyFileSync(srcPath, destPath);
	}
}

/** 清空 dist 目录 */
function emptyDir(dir) {
	if (!fs.existsSync(dir)) return;
	for (const entry of fs.readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const stat = fs.lstatSync(fullPath);
		if (stat.isDirectory()) {
			emptyDir(fullPath);
			fs.rmdirSync(fullPath);
		} else {
			fs.unlinkSync(fullPath);
		}
	}
}

function main() {
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir, { recursive: true });
	} else {
		emptyDir(distDir);
	}
	for (const entry of entriesToCopy) {
		copyEntry(entry);
	}
	console.log('静态资源已复制到 dist/');
	// 若存在 Android 原生工程，尽量把 web 图标复制到原生资源目录（便于快速替换原生启动图标）
	try {
		const androidResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
		const srcIcon = path.join(projectRoot, 'icon', 'logo.png');
		if (fs.existsSync(androidResDir) && fs.existsSync(srcIcon)) {
			const mipmaps = ['mipmap-mdpi','mipmap-hdpi','mipmap-xhdpi','mipmap-xxhdpi','mipmap-xxxhdpi','mipmap-anydpi-v26'];
			for (const m of mipmaps) {
				const targetDir = path.join(androidResDir, m);
				try {
					if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
					// 跳过 mipmap-anydpi-v26 的直接复制，以避免与 adaptive icon 的 ic_launcher.xml 冲突（重复资源）
					if (m === 'mipmap-anydpi-v26') {
						// 如果此前有遗留的 ic_launcher.png，先尝试删除它，避免重复资源导致构建失败
						const legacyTarget = path.join(targetDir, 'ic_launcher.png');
						try { if (fs.existsSync(legacyTarget)) fs.unlinkSync(legacyTarget); } catch (_) { /* 忽略删除失败 */ }
						continue;
					}
					const targetFile = path.join(targetDir, 'ic_launcher.png');
					fs.copyFileSync(srcIcon, targetFile);
				} catch (e) { /* 忽略单个复制失败 */ }
			}
			console.log('已尝试将 web 图标复制到 Android 原生资源目录（ic_launcher.png）');
		}
	} catch (_) { /* 忽略原生复制过程中的任何异常 */ }
}

main();


