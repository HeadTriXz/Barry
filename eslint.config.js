import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const files = ["apps/**/*.ts", "packages/**/*.ts"];

export default [
    js.configs.recommended,
    { files: files, rules: ts.configs["eslint-recommended"].overrides[0].rules },
    { files: files, rules: ts.configs["recommended-requiring-type-checking"].rules },
    { files: files, rules: ts.configs.recommended.rules },
    { ignores: ["**/dist/*"] },
    {
        files: files,
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.eslint.json",
                tsconfigRootDir: dirname(fileURLToPath(import.meta.url))
            }
        },
        plugins: {
            "@typescript-eslint": ts
        },
        rules: {
            "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
            "@typescript-eslint/consistent-indexed-object-style": "error",
            "@typescript-eslint/consistent-type-assertions": "error",
            "@typescript-eslint/consistent-type-definitions": "error",
            "@typescript-eslint/consistent-type-exports": ["error", { fixMixedExportsWithInlineTypeSpecifier: true }],
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
            "@typescript-eslint/member-delimiter-style": "error",
            "@typescript-eslint/member-ordering": [
                "error",
                {
                    default: {
                        memberTypes: [
                            // Index signature
                            "signature",
                            "call-signature",
                        
                            // Fields
                            "public-static-field",
                            "protected-static-field",
                            "private-static-field",
                            "#private-static-field",
                        
                            "public-decorated-field",
                            "protected-decorated-field",
                            "private-decorated-field",
                        
                            "public-instance-field",
                            "protected-instance-field",
                            "private-instance-field",
                            "#private-instance-field",
                        
                            "public-abstract-field",
                            "protected-abstract-field",
                        
                            "public-field",
                            "protected-field",
                            "private-field",
                            "#private-field",
                        
                            "static-field",
                            "instance-field",
                            "abstract-field",
                        
                            "decorated-field",
                        
                            "field",
                        
                            // Static initialization
                            "static-initialization",
                        
                            // Constructors
                            "public-constructor",
                            "protected-constructor",
                            "private-constructor",
                        
                            "constructor",
                        
                            // Getters
                            "public-static-get",
                            "protected-static-get",
                            "private-static-get",
                            "#private-static-get",
                        
                            "public-decorated-get",
                            "protected-decorated-get",
                            "private-decorated-get",
                        
                            "public-instance-get",
                            "protected-instance-get",
                            "private-instance-get",
                            "#private-instance-get",
                        
                            "public-abstract-get",
                            "protected-abstract-get",
                        
                            "public-get",
                            "protected-get",
                            "private-get",
                            "#private-get",
                        
                            "static-get",
                            "instance-get",
                            "abstract-get",
                        
                            "decorated-get",
                        
                            "get",
                        
                            // Setters
                            "public-static-set",
                            "protected-static-set",
                            "private-static-set",
                            "#private-static-set",
                        
                            "public-decorated-set",
                            "protected-decorated-set",
                            "private-decorated-set",
                        
                            "public-instance-set",
                            "protected-instance-set",
                            "private-instance-set",
                            "#private-instance-set",
                        
                            "public-abstract-set",
                            "protected-abstract-set",
                        
                            "public-set",
                            "protected-set",
                            "private-set",
                            "#private-set",
                        
                            "static-set",
                            "instance-set",
                            "abstract-set",
                        
                            "decorated-set",
                        
                            "set",
                        
                            // Methods
                            "public-static-method",
                            "protected-static-method",
                            "private-static-method",
                            "#private-static-method",
                        
                            "public-decorated-method",
                            "protected-decorated-method",
                            "private-decorated-method",
                        
                            "public-instance-method",
                            "protected-instance-method",
                            "private-instance-method",
                            "#private-instance-method",
                        
                            "public-abstract-method",
                            "protected-abstract-method",
                        
                            "public-method",
                            "protected-method",
                            "private-method",
                            "#private-method",
                        
                            "static-method",
                            "instance-method",
                            "abstract-method",
                        
                            "decorated-method",
                        
                            "method"
                        ],
                        order: "alphabetically"
                    }
                }
            ],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/semi": ["error", "always"],
            "arrow-parens": "error",
            "brace-style": "error",
            "comma-dangle": "error",
            "comma-spacing": "error",
            "curly": ["error", "multi-line"],
            "eol-last": "error",
            "indent": "off",
            "keyword-spacing": "error",
            "max-len": [
                "error",
                {
                    code: 120,
                    ignoreComments: true,
                    ignoreStrings: true,
                    ignoreTemplateLiterals: true,
                    ignoreRegExpLiterals: true
                }
            ],
            "no-empty": "off",
            "no-fallthrough": "error",
            "no-floating-decimal": "error",
            "no-inner-declarations": "error",
            "no-multiple-empty-lines": "error",
            "no-multi-spaces": "error",
            "no-prototype-builtins": "off",
            "no-throw-literal": "error",
            "no-trailing-spaces": "error",
            "no-unneeded-ternary": "error",
            "no-useless-constructor": "error",
            "no-var": "error",
            "object-curly-spacing": ["error", "always"],
            "object-shorthand": [2, "consistent-as-needed"],
            "prefer-const": "error",
            "quotes": ["error", "double"],
            "semi": "off",
            "space-infix-ops": "error",
            "yoda": "error"
        }
    },
    {
        files: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
        plugins: {
            "@typescript-eslint": ts
        },
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/unbound-method": "off"
        }
    }
];
