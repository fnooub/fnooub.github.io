// ==UserScript==
// @name         ChatGPT Prompt nhiều dòng
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Creates a draggable custom textarea on the right side of the screen to enhance prompts. Double Ctrl press processes the prompt, simulates Shift+Esc to focus ChatGPT's textarea, and pastes the content directly.
// @author       Grok
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const simulateEnter = true;
    let isProcessing = false;

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

    function detectHealthState(text) {
        const lowerText = text.toLowerCase();
        for (const [state, keywords] of Object.entries(data.healthStates)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return state;
            }
        }
        return 'khỏi bệnh';
    }

    function detectContext(text) {
        const lowerText = text.toLowerCase();
        for (const [context, { keywords }] of Object.entries(data.contextPrompts)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return context;
            }
        }
        return data.defaultContext;
    }

    function getCharacterDescription(character, context) {
        return data.characterPrompts[character]?.[context] || data.characterPrompts[character]?.['default'] || '';
    }

    function getAnimalDescription(animal, healthState) {
        return data.animalPrompts[animal]?.[healthState] || data.animalPrompts[animal]?.[Object.keys(data.healthStates)[0]] || '';
    }

    function processPrompt(textarea, singleLine = false) {
        const input = singleLine ? textarea : textarea.value.trim();
        if (!input) {
            textarea.value = 'Please enter a prompt.';
            textarea.focus();
            return null;
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
        if (!singleLine) {
            textarea.value = newText;
            textarea.focus();
        }
        return newText;
    }

    function simulateShiftEsc() {
        const shiftEscEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(shiftEscEvent);
        console.log('Đã mô phỏng Shift + Esc');
    }

    function simulateEnterKey() {
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
        });
        const chatGptTextarea = document.querySelector('#prompt-textarea.ProseMirror');
        if (chatGptTextarea) {
            chatGptTextarea.dispatchEvent(enterEvent);
            console.log('Đã mô phỏng nhấn Enter');
        } else {
            console.error('Không tìm thấy ô nhập liệu ChatGPT để mô phỏng Enter');
        }
    }

    function pasteToChatGptTextarea(text) {
        const chatGptTextarea = document.querySelector('#prompt-textarea.ProseMirror');
        if (chatGptTextarea) {
            const note = " Note: Always in English, one line, under 950 characters.";
            const updatedText = text + note;
            chatGptTextarea.innerText = updatedText;
            const inputEvent = new Event('input', { bubbles: true });
            chatGptTextarea.dispatchEvent(inputEvent);
            console.log('Đã dán nội dung vào ô nhập liệu ChatGPT:', updatedText);

            if (simulateEnter) {
                setTimeout(() => {
                    simulateEnterKey();
                }, 100);
            }
        } else {
            console.error('Không tìm thấy ô nhập liệu ChatGPT');
        }
    }

    function waitForProcessingToComplete(callback) {
        const checkInterval = setInterval(() => {
            const stopButton = document.querySelector('#composer-submit-button[aria-label="Dừng phát trực tuyến"]');
            if (!stopButton) {
                clearInterval(checkInterval);
                console.log('ChatGPT đã hoàn thành xử lý.');
                callback();
            } else {
                console.log('ChatGPT đang xử lý, đợi...');
            }
        }, 500);
    }

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

    function createCustomTextarea() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.right = '10px';
        container.style.transform = 'translateY(-50%)';
        container.style.backgroundColor = 'rgb(255, 255, 255)';
        container.style.padding = '10px';
        container.style.border = '1px solid rgb(204, 204, 204)';
        container.style.borderRadius = '8px';
        container.style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 2px 5px';
        container.style.zIndex = '1000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.width = '300px';
        container.style.cursor = 'move';

        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '319px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid rgb(204, 204, 204)';
        textarea.style.borderRadius = '4px';
        textarea.style.resize = 'vertical';
        textarea.placeholder = 'Nhập prompt của bạn...';

        const statusElement = document.createElement('div');
        statusElement.style.fontSize = '12px';
        statusElement.style.color = '#333';
        statusElement.textContent = 'Sẵn sàng';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.marginTop = '5px';

        const genButton = document.createElement('button');
        genButton.textContent = 'Gen';
        genButton.style.backgroundColor = 'rgb(33, 150, 243)';
        genButton.style.color = 'white';
        genButton.style.padding = '10px 20px';
        genButton.style.border = 'none';
        genButton.style.borderRadius = '4px';
        genButton.style.cursor = 'pointer';
        genButton.style.fontSize = '14px';
        console.log('Nút Gen đã được tạo');

        const editJsonButton = document.createElement('button');
        editJsonButton.textContent = 'Edit JSON';
        editJsonButton.style.backgroundColor = 'rgb(33, 150, 243)';
        editJsonButton.style.color = 'white';
        editJsonButton.style.padding = '10px 20px';
        editJsonButton.style.border = 'none';
        editJsonButton.style.borderRadius = '4px';
        editJsonButton.style.cursor = 'pointer';
        editJsonButton.style.fontSize = '14px';
        console.log('Nút Edit JSON đã được tạo');

        function processLines(lines, textarea) {
            let currentIndex = 0;

            const processNextLine = () => {
                if (currentIndex >= lines.length) {
                    statusElement.textContent = 'Hoàn tất xử lý tất cả các dòng!';
                    // textarea.value = '';
                    isProcessing = false;
                    genButton.disabled = false;
                    genButton.textContent = 'Gen';
                    console.log('Hoàn tất tất cả các dòng');
                    return;
                }

                if (isProcessing) {
                    statusElement.textContent = 'Đang xử lý, vui lòng chờ...';
                    setTimeout(processNextLine, 500);
                    return;
                }

                isProcessing = true;
                genButton.disabled = true;
                genButton.textContent = 'Đang xử lý...';
                const line = lines[currentIndex].trim();
                statusElement.textContent = `Đang xử lý dòng ${currentIndex + 1}/${lines.length}`;
                console.log(`Xử lý dòng ${currentIndex + 1}: ${line}`);

                if (!line) {
                    console.log(`Dòng ${currentIndex + 1} rỗng, bỏ qua`);
                    currentIndex++;
                    isProcessing = false;
                    genButton.disabled = false;
                    genButton.textContent = 'Gen';
                    processNextLine();
                    return;
                }

                const processedText = processPrompt(line, true);
                if (processedText) {
                    simulateShiftEsc();
                    setTimeout(() => {
                        pasteToChatGptTextarea(processedText);
                        console.log(`Đã dán dòng ${currentIndex + 1}: ${processedText}`);
                        waitForProcessingToComplete(() => {
                            textarea.value = lines.slice(currentIndex + 1).join('\n');
                            console.log(`Cập nhật textarea: ${textarea.value}`);
                            currentIndex++;
                            isProcessing = false;
                            genButton.disabled = false;
                            genButton.textContent = 'Gen';
                            processNextLine();
                        });
                    }, 500); // Tăng thời gian chờ lên 500ms
                } else {
                    console.log(`Không xử lý được dòng ${currentIndex + 1}`);
                    currentIndex++;
                    isProcessing = false;
                    genButton.disabled = false;
                    genButton.textContent = 'Gen';
                    processNextLine();
                }
            };

            processNextLine();
        }

        genButton.addEventListener('click', () => {
            console.log('Nút Gen được nhấn');
            const lines = textarea.value.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                statusElement.textContent = 'Vui lòng nhập ít nhất một dòng!';
                textarea.focus();
                return;
            }
            processLines(lines, textarea);
        });

        let lastCtrlPress = 0;
        const doublePressDelay = 300;
        textarea.addEventListener('keydown', (event) => {
            if (event.key === 'Control') {
                const currentTime = new Date().getTime();
                if (currentTime - lastCtrlPress < doublePressDelay) {
                    const lines = textarea.value.split('\n').filter(line => line.trim());
                    if (lines.length === 0) {
                        statusElement.textContent = 'Vui lòng nhập ít nhất một dòng!';
                        textarea.focus();
                        return;
                    }
                    processLines(lines, textarea);
                    lastCtrlPress = 0;
                } else {
                    lastCtrlPress = currentTime;
                }
            }
        });

        editJsonButton.addEventListener('click', () => {
            console.log('Nút Edit JSON được nhấn');
            createJsonPopup();
        });

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        container.addEventListener('mousedown', (e) => {
            if (e.target === textarea || e.target === genButton || e.target === editJsonButton) return;
            isDragging = true;
            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;
            container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                container.style.left = `${currentX}px`;
                container.style.top = `${currentY}px`;
                container.style.right = 'auto';
                container.style.transform = 'none';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'move';
        });

        currentX = window.innerWidth - parseInt(container.style.right) - container.offsetWidth;
        currentY = (window.innerHeight - container.offsetHeight) / 2;

        buttonContainer.appendChild(genButton);
        buttonContainer.appendChild(editJsonButton);
        console.log('Đã thêm các nút vào buttonContainer');

        container.appendChild(textarea);
        container.appendChild(statusElement);
        container.appendChild(buttonContainer);
        document.body.appendChild(container);
        console.log('Đã thêm container vào body');
    }

    createCustomTextarea();
})();