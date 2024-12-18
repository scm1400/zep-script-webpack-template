const path = require("path");

class SequentialChunkRenamerPlugin {
    apply(compiler) {
        compiler.hooks.emit.tap("SequentialChunkRenamerPlugin", (compilation) => {
            // main.js를 제외한 모든 JS 청크(청크 아이디 순)만 가져오기
            const chunks = compilation.chunks.filter((chunk) => chunk.name !== "main").sort((a, b) => a.id - b.id);

            chunks.forEach((chunk, idx) => {
                // 각 청크가 만든 JS 파일명을 찾고
                const oldName = Array.from(chunk.files).find((f) => f.endsWith(".js") && f !== "main.js");
                if (!oldName) return;

                // idx는 0부터 시작하니까 +1, 3자리 0패딩
                const newName = `chunk-local-${String(idx + 1).padStart(3, "0")}.js`;

                // assets에 새 이름으로 복제하고, 옛 이름은 삭제
                compilation.assets[newName] = compilation.assets[oldName];
                delete compilation.assets[oldName];
            });
        });
    }
}

module.exports = {
    mode: "production",
    entry: "./main.ts",
    module: {
        rules: [
            { test: /\.ts$/, use: "babel-loader", exclude: /node_modules/ },
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    transpileOnly: false,
                },
                exclude: /node_modules/
            }
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "zep-script": path.resolve(__dirname, "node_modules/zep-script"),
        },
    },

    output: {
        filename: "[name].js", // main.js
        chunkFilename: "[name].js", // 임시 이름 → 플러그인이 최종 리네임
        globalObject: "this", // Jint 호환을 위해 self 대신 this 사용
        path: path.resolve(__dirname, "res"),
    },

    optimization: {
        minimize: false,
        chunkIds: "natural", // 0,1,2… 순번 보장
        runtimeChunk: false, // 런타임은 main.js에

        splitChunks: {
            chunks: "all",
            minSize: 50 * 1024, // 최소 50KB 쌓여야 분할
            maxSize: 128 * 1024, // 128KB 넘으면 자동 분할
            automaticNameDelimiter: "-",
            cacheGroups: {
                default: false,
                vendors: false,
                local: {
                    test: /[\\/]libs[\\/]/,
                    chunks: "all",
                    priority: 10,
                    reuseExistingChunk: true,
                    // name을 지정하지 않아, emit 시 플러그인으로만 이름 붙임
                },
            },
        },
    },

    plugins: [new SequentialChunkRenamerPlugin()],
};
