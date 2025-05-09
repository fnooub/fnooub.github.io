// ==UserScript==
// @name         Grok Prompt Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Enhances prompts in ChatGPT's contenteditable div by double-pressing Ctrl, moves cursor to end, with a button to edit JSON data in a popup and save to localStorage
// @author       Grok
// @match        https://grok.com/chat/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Dữ liệu mặc định
    const defaultData = {
        characterPrompts: {
            'jack': {
                'đường phố new york': 'Jack là một người tóc đen, mặc áo sơ mi xanh, quần jeans',
                'sa mạc thảo nguyên châu phi': 'Jack là một người tóc đen, mặc áo thun kaki, quần cargo',
                'default': 'Jack là một người tóc đen, mặc áo sơ mi xanh, quần jeans'
            },
            'luna': {
                'đường phố new york': 'Luna là một người tóc vàng, mặc áo hồng, cầm túi xách',
                'sa mạc thảo nguyên châu phi': 'Luna là một người tóc vàng, mặc áo thun trắng, quần short',
                'default': 'Luna là một người tóc vàng, mặc áo hồng'
            }
        },
        animalPrompts: {
            'báo tuyết': {
                'bị bệnh': 'Báo tuyết lông xỉn, mắt mờ, vết ong đốt trên lưng',
                'khỏi bệnh': 'Báo tuyết lông trắng sáng, mắt xanh, chạy nhảy linh hoạt'
            },
            'ngựa nâu': {
                'bị bệnh': 'Ngựa nâu lông bết, thở yếu, sưng do ong đốt',
                'khỏi bệnh': 'Ngựa nâu lông nâu bóng, phi nước đại mạnh mẽ'
            },
            'báo mẹ': {
                'bị bệnh': 'Báo mẹ lông xỉn, mắt mờ, vết ong đốt trên lưng',
                'khỏi bệnh': 'Báo mẹ lông trắng sáng, mắt xanh, chạy nhảy linh hoạt'
            }
        },
        contextPrompts: {
            'đường phố new york': {
                description: 'Bối cảnh đường phố New York',
                keywords: ['đường phố', 'mua sắm', 'new york', 'thành phố']
            },
            'sa mạc thảo nguyên châu phi': {
                description: 'Bối cảnh sa mạc thảo nguyên châu Phi',
                keywords: ['thảo nguyên', 'châu phi', 'safari', 'sa mạc']
            }
        },
        healthStates: {
            'bị bệnh': ['bị bệnh', 'ốm', 'yếu', 'bị thương', 'ong đốt'],
            'khỏi bệnh': ['khỏi', 'khỏe mạnh', 'bình phục']
        },
        defaultContext: 'đường phố new york'
    };

    // Tải dữ liệu từ localStorage hoặc dùng mặc định
    let data = defaultData;
    const storedData = localStorage.getItem('grokPromptEnhancerData');
    if (storedData) {
        try {
            data = JSON.parse(storedData);
            console.log('Đã tải dữ liệu từ localStorage:', data);
        } catch (e) {
            console.error('Lỗi khi parse dữ liệu từ localStorage:', e);
        }
    }

    // Hàm xác định trạng thái sức khỏe
    function detectHealthState(text) {
        const lowerText = text.toLowerCase();
        for (const [state, keywords] of Object.entries(data.healthStates)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return state;
            }
        }
        return 'khỏi bệnh';
    }

    // Hàm xác định bối cảnh
    function detectContext(text) {
        const lowerText = text.toLowerCase();
        for (const [context, { keywords }] of Object.entries(data.contextPrompts)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return context;
            }
        }
        return data.defaultContext;
    }

    // Hàm lấy mô tả nhân vật
    function getCharacterDescription(character, context) {
        return data.characterPrompts[character]?.[context] || data.characterPrompts[character]?.['default'] || '';
    }

    // Hàm lấy mô tả con vật
    function getAnimalDescription(animal, healthState) {
        return data.animalPrompts[animal]?.[healthState] || data.animalPrompts[animal]?.[Object.keys(data.healthStates)[0]] || '';
    }

    // Hàm xử lý câu
    function processPrompt(editor) {
        const input = editor.innerText.trim();
        if (!input) {
            editor.innerText = 'Please enter a prompt.';
            editor.focus();
            placeCaretAtEnd(editor);
            return;
        }

        const context = detectContext(input);
        const healthState = detectHealthState(input);

        const characters = Object.keys(data.characterPrompts);
        const animals = Object.keys(data.animalPrompts);
        const contextKeywords = [];
        for (const ctx in data.contextPrompts) {
            contextKeywords.push(...data.contextPrompts[ctx].keywords);
        }

        const allKeywords = [...characters, ...animals, ...contextKeywords];
        allKeywords.sort((a, b) => b.length - a.length);

        const tokens = input.split(/(\s+)/);
        let result = [];
        const processedKeywords = new Set();

        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let found = false;

            if (token.match(/\s+/)) {
                result.push(token);
                continue;
            }

            let tripleToken = i < tokens.length - 2 ? (token + tokens[i + 1] + tokens[i + 2]).trim() : null;
            if (tripleToken) {
                const tripleLower = tripleToken.toLowerCase();
                if (allKeywords.includes(tripleLower)) {
                    if (!processedKeywords.has(tripleLower)) {
                        if (characters.includes(tripleLower)) {
                            const desc = getCharacterDescription(tripleLower, context);
                            if (desc) {
                                result.push(token + tokens[i + 1] + tokens[i + 2] + ` (${desc}) `);
                            }
                            processedKeywords.add(tripleLower);
                        } else if (animals.includes(tripleLower)) {
                            const desc = getAnimalDescription(tripleLower, healthState);
                            if (desc) {
                                result.push(token + tokens[i + 1] + tokens[i + 2] + ` (${desc}) `);
                            }
                            processedKeywords.add(tripleLower);
                        } else if (contextKeywords.includes(tripleLower)) {
                            if (!processedKeywords.has(`context:${context}`)) {
                                const desc = data.contextPrompts[context].description;
                                if (desc) {
                                    result.push(token + tokens[i + 1] + tokens[i + 2] + ` (${desc}) `);
                                }
                                processedKeywords.add(`context:${context}`);
                            } else {
                                result.push(token + tokens[i + 1] + tokens[i + 2]);
                            }
                        }
                    } else {
                        result.push(token + tokens[i + 1] + tokens[i + 2]);
                    }
                    i += 2;
                    found = true;
                }
            }

            if (!found) {
                const lowerToken = token.toLowerCase();
                if (allKeywords.includes(lowerToken)) {
                    if (!processedKeywords.has(lowerToken)) {
                        if (characters.includes(lowerToken)) {
                            const desc = getCharacterDescription(lowerToken, context);
                            if (desc) {
                                result.push(token + ` (${desc}) `);
                            }
                            processedKeywords.add(lowerToken);
                        } else if (animals.includes(lowerToken)) {
                            const desc = getAnimalDescription(lowerToken, healthState);
                            if (desc) {
                                result.push(token + ` (${desc}) `);
                            }
                            processedKeywords.add(lowerToken);
                        } else if (contextKeywords.includes(lowerToken)) {
                            if (!processedKeywords.has(`context:${context}`)) {
                                const desc = data.contextPrompts[context].description;
                                if (desc) {
                                    result.push(token + ` (${desc}) `);
                                }
                                processedKeywords.add(`context:${context}`);
                            } else {
                                result.push(token);
                            }
                        }
                    } else {
                        result.push(token);
                    }
                } else {
                    result.push(token);
                }
            }
        }

        const newText = result.join('');
        editor.innerText = newText;
        editor.focus();
        placeCaretAtEnd(editor);
    }

    // Hàm đặt con trỏ ở cuối nội dung
    function placeCaretAtEnd(el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // Tạo và hiển thị popup chỉnh sửa JSON
    function createJsonPopup() {
        const modal = document.createElement('div');
        modal.id = 'json-editor-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '1000';

        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#fff';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '600px';
        modalContent.style.maxHeight = '80%';
        modalContent.style.overflow = 'auto';

        const jsonTextarea = document.createElement('textarea');
        jsonTextarea.style.width = '100%';
        jsonTextarea.style.height = '300px';
        jsonTextarea.style.padding = '10px';
        jsonTextarea.style.border = '1px solid #ccc';
        jsonTextarea.style.borderRadius = '4px';
        jsonTextarea.style.resize = 'vertical';
        jsonTextarea.value = JSON.stringify(data, null, 2);

        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'red';
        errorMessage.style.marginTop = '10px';
        errorMessage.style.display = 'none';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.textAlign = 'right';

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.style.color = 'white';
        saveButton.style.padding = '10px 20px';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.marginRight = '10px';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.backgroundColor = '#ccc';
        cancelButton.style.color = '#333';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';

        saveButton.addEventListener('click', () => {
            try {
                const newData = JSON.parse(jsonTextarea.value);
                data = newData;
                localStorage.setItem('grokPromptEnhancerData', JSON.stringify(newData));
                console.log('Đã lưu dữ liệu vào localStorage:', newData);
                errorMessage.style.display = 'none';
                document.body.removeChild(modal);
            } catch (e) {
                errorMessage.textContent = 'Lỗi: JSON không hợp lệ. Vui lòng kiểm tra lại.';
                errorMessage.style.display = 'block';
            }
        });

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(cancelButton);
        modalContent.appendChild(jsonTextarea);
        modalContent.appendChild(errorMessage);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    // Tạo nút Edit JSON
    function createEditJsonButton(editor) {
        const button = document.createElement('button');
        button.textContent = 'Edit JSON';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.padding = '10px 20px';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.marginTop = '10px';
        button.addEventListener('click', createJsonPopup);

        const form = editor.closest('form');
        if (form) {
            form.parentElement.appendChild(button);
        } else {
            document.body.appendChild(button);
        }
    }

    // Hàm khởi tạo sự kiện cho contenteditable
    function initializeEditor(editor) {
        let lastCtrlPress = 0;
        const doublePressDelay = 300;

        createEditJsonButton(editor);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Control' && document.activeElement === editor) {
                const currentTime = new Date().getTime();
                if (currentTime - lastCtrlPress < doublePressDelay) {
                    processPrompt(editor);
                    lastCtrlPress = 0;
                } else {
                    lastCtrlPress = currentTime;
                }
            }
        });

        console.log('Contenteditable div được khởi tạo:', editor);
    }

    // Tìm div contenteditable ban đầu
    let editor = document.querySelector('#prompt-textarea.ProseMirror');

    if (editor) {
        initializeEditor(editor);
    } else {
        console.warn('Không tìm thấy div contenteditable ban đầu, đang theo dõi khu vực body...');
        const observer = new MutationObserver((mutations, obs) => {
            editor = document.querySelector('#prompt-textarea.ProseMirror');
            if (editor) {
                initializeEditor(editor);
                obs.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            if (!editor) {
                console.error('Không tìm thấy div contenteditable sau 10 giây, ngừng theo dõi.');
                observer.disconnect();
            }
        }, 10000);
    }
})();