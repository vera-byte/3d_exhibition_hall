/**
 * esbuild 构建脚本
 */
import * as esbuild from 'esbuild';

const buildOptions = {
    entryPoints: ['main.ts'],
    outfile: 'main.js',
    format: 'esm',
    target: ['es2020'],
    sourcemap: true,
    bundle: true,
    minify: false,
    external: ['three'],
    logLevel: 'info',
};

const isWatch = process.argv.includes('--watch');

async function build() {
    try {
        if (isWatch) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log('监听模式已启动，文件变化时将自动重新构建...');
        } else {
            await esbuild.build(buildOptions);
            console.log('构建完成！');
        }
    } catch (error) {
        console.error('构建失败:', error);
        process.exit(1);
    }
}

build();
