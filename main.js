document.addEventListener('DOMContentLoaded', () => {
    // Central data stores
    let tableData = { headers: [], allRows: [] };
    let reactantsData = { headers: [], allRows: [] };
    let environmentEffectsData = { headers: [], allRows: [] };
    let reactantsOptions = [];
    let environmentOptions = [];
    let choiceInstances = []; // To keep track of Choices.js instances
    let currentPage = 1;
    const rowsPerPage = 20; // 每页显示20行
    let currentTab = 'reactions'; // 当前激活的tab

    // DOM Element references
    const mainFileInput = document.getElementById('main-file-input');
    const reactantsFileInput = document.getElementById('reactants-file-input');
    const effectsFileInput = document.getElementById('effects-file-input');
    const tableContainer = document.getElementById('table-container');
    const addRowButton = document.getElementById('add-row-button');
    const saveButton = document.getElementById('save-button');
    const tabs = document.querySelectorAll('.tab');
    
    // 创建通知容器
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
    
    // 显示非阻断式通知的函数
    function showNotification(message, duration = 3000, backgroundColor = '#4CAF50') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.backgroundColor = backgroundColor;
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(50px)';
        notification.style.transition = 'opacity 0.3s, transform 0.3s';
        
        notificationContainer.appendChild(notification);
        
        // 触发重排以应用过渡效果
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // 设置自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(50px)';
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 300);
        }, duration);
    }

    // 立即检查Choices.js是否已加载
    console.log('Choices.js loaded status:', typeof Choices !== 'undefined');
    if (typeof Choices === 'undefined') {
        console.error('Choices.js not loaded at initialization');
        showNotification('警告：Choices.js未能加载，下拉框功能将不可用。请检查网络连接并刷新页面。', 5000, '#ff9800');
    } else {
        console.log('Choices.js loaded successfully, version:', Choices.version);
    }

    // Event Listeners
    mainFileInput.addEventListener('change', (e) => handleFileLoad(e, 'main'));
    reactantsFileInput.addEventListener('change', (e) => handleFileLoad(e, 'reactants'));
    effectsFileInput.addEventListener('change', (e) => handleFileLoad(e, 'effects'));
    addRowButton.addEventListener('click', handleAddRow);
    saveButton.addEventListener('click', handleSaveFile);
    
    // Tab切换事件监听器
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // 初始化按钮文本
    updateAddButtonText(currentTab);

    function handleFileLoad(event, fileType) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parsed = parseCSV(text);
                if (fileType === 'main') {
                    tableData = processData(parsed);
                    currentPage = 1; // 重置页码
                    currentTab = 'reactions';
                    switchTab('reactions');
                    showNotification(`Reactions data loaded successfully: ${tableData.allRows.length - 2} rows`);
                } else if (fileType === 'reactants') {
                    reactantsData = processData(parsed);
                    const formulaIndex = parsed.headers.indexOf('chemical_formula');
                    if(formulaIndex === -1) throw new Error('reactants.csv does not contain chemical_formula column.');
                    reactantsOptions = parsed.allRows.slice(2).map(row => row[formulaIndex]).filter(Boolean);
                    console.log('Reactants options loaded:', reactantsOptions); // 添加日志
                    showNotification(`Reactants data loaded successfully: ${reactantsData.allRows.length - 2} rows`);
                    if (currentTab === 'reactions' && tableData.headers.length > 0) {
                        console.log('Regenerating table with new reactants options');
                        generateTable(); // Re-render table if main data exists
                    }
                } else if (fileType === 'effects') {
                    environmentEffectsData = processData(parsed);
                    const nameIndex = parsed.headers.indexOf('name');
                    if(nameIndex === -1) throw new Error('environment_effects.csv does not contain name column.');
                    environmentOptions = parsed.allRows.slice(2).map(row => row[nameIndex]).filter(Boolean);
                    console.log('Environment options loaded:', environmentOptions); // 添加日志
                    showNotification(`Environment effects data loaded successfully: ${environmentEffectsData.allRows.length - 2} rows`);
                    if (currentTab === 'reactions' && tableData.headers.length > 0) {
                        console.log('Regenerating table with new environment options');
                        generateTable(); // Re-render table if main data exists
                    }
                }
            } catch (error) {
                console.error("Error processing file:", error);
                // 使用红色背景的通知显示错误
                showNotification(`Error: ${error.message}`, 5000, '#f44336');
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    }

    function handleAddRow() {
        const currentData = getCurrentTabData();
        if (currentData.headers.length === 0) {
            showNotification(`请先加载${currentTab}文件。`, 3000, '#ff9800');
            return;
        }
        const idIndex = currentData.headers.indexOf('id');
        let newId = 1;
        const dataRows = currentData.allRows.slice(2);
        if (dataRows.length > 0) {
            const lastRow = dataRows[dataRows.length - 1];
            const lastId = parseInt(lastRow[idIndex], 10);
            if (!isNaN(lastId)) newId = lastId + 1;
        }
        const newRow = Array(currentData.headers.length).fill('');
        if (idIndex !== -1) newRow[idIndex] = newId.toString();
        currentData.allRows.push(newRow);
        // 添加新行后，跳转到最后一页
        const totalPages = Math.ceil((currentData.allRows.length - 2) / rowsPerPage);
        currentPage = totalPages;
        generateTable();
        showNotification("已添加新行", 2000);
    }

    function handleSaveFile() {
        const currentData = getCurrentTabData();
        if (currentData.headers.length === 0) {
            showNotification("没有数据可保存。", 3000, '#ff9800');
            return;
        }
        const csvContent = convertDataToCSV(currentData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${currentTab}-modified.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification("文件已保存", 2000);
    }
    
    function switchTab(tabName) {
        // 更新tab样式
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });
        
        currentTab = tabName;
        currentPage = 1; // 重置页码
        
        // 更新新增按钮的文本
        updateAddButtonText(tabName);
        
        // 根据当前tab显示对应的数据
        generateTable();
    }
    
    function updateAddButtonText(tabName) {
        const buttonTextMap = {
            'reactions': '新增反应',
            'reactants': '新增反应物',
            'environment_effects': '新增环境影响'
        };
        
        if (addRowButton) {
            addRowButton.textContent = buttonTextMap[tabName] || '新增';
        }
    }
    
    function getCurrentTabData() {
        switch (currentTab) {
            case 'reactions':
                return tableData;
            case 'reactants':
                return reactantsData;
            case 'environment_effects':
                return environmentEffectsData;
            default:
                return tableData;
        }
    }
    
    function convertDataToCSV(data = null) {
        const currentData = data || getCurrentTabData();
        const headerString = currentData.headers.join(',');
        const rowsString = currentData.allRows.map(row => row.join(',')).join('\n');
        return `${headerString}\n${rowsString}`;
    }

    function processData(data) {
        const { headers, allRows } = data;
        const equationIndex = headers.indexOf('reaction_equation');
        const reactantsIndex = headers.indexOf('reactants');
        const productsIndex = headers.indexOf('products');

        if (equationIndex === -1 || reactantsIndex === -1 || productsIndex === -1) return data;

        const processedRows = allRows.map((row, index) => {
            if (index < 2) return row;
            
            // 创建新行的副本，避免直接修改原始数据
            const newRow = [...row];
            const equation = row[equationIndex];
            const reactants = row[reactantsIndex];
            const products = row[productsIndex];
            
            // 规则8-5：从反应方程式解析reactants和products
            if (equation && equation.includes('->')) {
                const parts = equation.split('->');
                const clean = (s) => s.trim().replace(/^\d+/, '').replace(/[↑↓]$/, '');
                const format = (str) => {
                    if (!str) return '';
                    return str.trim().split('+').map(clean).filter(Boolean).join('|');
                };
                
                // 如果reactants为空，则从方程式解析
                if (!reactants || reactants.trim() === '') {
                    newRow[reactantsIndex] = format(parts[0]);
                }
                
                // 如果products为空，则从方程式解析
                if (!products || products.trim() === '') {
                    newRow[productsIndex] = format(parts[1]);
                }
            }
            
            // 规则8-6：从reactants和products生成反应方程式
            if ((!equation || equation.trim() === '') && 
                reactants && reactants.trim() !== '' && 
                products && products.trim() !== '') {
                
                const reactantsList = reactants.split('|').filter(Boolean);
                const productsList = products.split('|').filter(Boolean);
                
                if (reactantsList.length > 0 && productsList.length > 0) {
                    newRow[equationIndex] = `${reactantsList.join(' + ')} -> ${productsList.join(' + ')}`;
                }
            }
            
            return newRow;
        });
        return { headers, allRows: processedRows };
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length === 0) return { headers: [], allRows: [] };
        const headers = lines[0].split(',');
        const allRows = lines.slice(1).map(line => line.split(','));
        return { headers, allRows };
    }

    // 创建分页控件
    function createPagination() {
        const currentData = getCurrentTabData();
        const totalRows = currentData.allRows.length - 2; // 减去前两行（描述和类型）
        if (totalRows <= 0) return null;
        
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        if (totalPages <= 1) return null; // 只有一页不需要分页
        
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        paginationDiv.style.display = 'flex';
        paginationDiv.style.justifyContent = 'center';
        paginationDiv.style.margin = '20px 0';
        paginationDiv.style.gap = '5px';
        
        // 上一页按钮
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '上一页';
            prevButton.className = 'button-style';
            prevButton.addEventListener('click', () => {
                currentPage--;
                generateTable();
            });
            paginationDiv.appendChild(prevButton);
        }
        
        // 页码按钮
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i.toString();
            pageButton.className = 'button-style';
            if (i === currentPage) {
                pageButton.style.backgroundColor = '#4d90fe';
                pageButton.style.color = 'white';
            }
            pageButton.addEventListener('click', () => {
                currentPage = i;
                generateTable();
            });
            paginationDiv.appendChild(pageButton);
        }
        
        // 下一页按钮
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = '下一页';
            nextButton.className = 'button-style';
            nextButton.addEventListener('click', () => {
                currentPage++;
                generateTable();
            });
            paginationDiv.appendChild(nextButton);
        }
        
        // 页码信息
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `${currentPage}/${totalPages}页，共${totalRows}条数据`;
        pageInfo.style.marginLeft = '10px';
        pageInfo.style.alignSelf = 'center';
        paginationDiv.appendChild(pageInfo);
        
        return paginationDiv;
    }

    function generateTable() {
        // 检查Choices.js是否已加载
        if (typeof Choices === 'undefined') {
            console.error("错误：Choices.js未能加载");
            showNotification("错误：核心下拉框库 (Choices.js) 未能加载。\n请检查你的网络连接或浏览器安全设置，并刷新页面重试。", 5000, '#f44336');
            return;
        }

        // 添加日志，检查选项数组
        console.log('Generating table with options:', { 
            reactantsOptions: reactantsOptions.length, 
            environmentOptions: environmentOptions.length, 
            choiceInstances: choiceInstances.length 
        });

        // 清理之前的实例
        try {
            choiceInstances.forEach(instance => {
                try {
                    if (instance && typeof instance.destroy === 'function') {
                        instance.destroy();
                    }
                } catch (e) {
                    console.error('Error destroying Choices instance:', e);
                }
            });
            choiceInstances = [];
        } catch (e) {
            console.error('Error cleaning up Choices instances:', e);
        }

        tableContainer.innerHTML = '';
        const currentData = getCurrentTabData();
        if (currentData.headers.length === 0) return;

        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        
        // 表格样式通过CSS控制
        table.style.tableLayout = 'fixed';
        
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        currentData.headers.forEach((headerText, index) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            
            // 列宽度由colgroup控制
            
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // 计算当前页应该显示的行
        const startIdx = 2; // 前两行是描述和类型，始终显示
        const dataStartIdx = startIdx + (currentPage - 1) * rowsPerPage;
        const dataEndIdx = Math.min(dataStartIdx + rowsPerPage, currentData.allRows.length);
        
        // 添加描述和类型行（前两行）
        for (let i = 0; i < startIdx && i < currentData.allRows.length; i++) {
            const rowData = currentData.allRows[i];
            const row = document.createElement('tr');
            rowData.forEach((cellData, colIndex) => {
                const td = document.createElement('td');
                td.textContent = cellData;
                
                // 列宽度由colgroup控制
                
                row.appendChild(td);
            });
            tbody.appendChild(row);
        }
        
        // 添加当前页的数据行
        for (let rowIndex = dataStartIdx; rowIndex < dataEndIdx; rowIndex++) {
            const rowData = currentData.allRows[rowIndex];
            const row = document.createElement('tr');
            rowData.forEach((cellData, colIndex) => {
                const td = document.createElement('td');
                const header = currentData.headers[colIndex];
                
                // 列宽度由colgroup控制

                let options = [];
                let isChoicesInput = false;
                
                // 检查列名和选项数组
                if (['reactants', 'products'].includes(header)) {
                    options = [...reactantsOptions]; // 创建副本避免引用问题
                    isChoicesInput = options.length > 0; // 只有当有选项时才启用
                    console.log(`Column ${header} has ${options.length} options, isChoicesInput=${isChoicesInput}`);
                } else if (['reaction_conditon', 'reaction_effect'].includes(header)) {
                    options = [...environmentOptions]; // 创建副本避免引用问题
                    isChoicesInput = options.length > 0; // 只有当有选项时才启用
                    console.log(`Column ${header} has ${options.length} options, isChoicesInput=${isChoicesInput}`);
                }

                if (isChoicesInput && options.length > 0) {
                    try {
                        console.log(`Creating Choices input for ${header} with ${options.length} options`);
                        const input = document.createElement('select');
                        input.multiple = true;
                        input.className = 'choices-input';
                        td.appendChild(input);

                        // 添加选项元素
                        options.forEach(option => {
                            const optElement = document.createElement('option');
                            optElement.value = option;
                            optElement.textContent = option;
                            input.appendChild(optElement);
                        });

                        // 确保选项格式正确
                        console.log(`Creating Choices for ${header}`);

                        // 创建Choices实例
                        const choices = new Choices(input, {
                            delimiter: '|',
                            editItems: true,
                            maxItemCount: -1,
                            removeItemButton: true,
                            searchEnabled: true,
                            placeholder: true,
                            // placeholderValue: `选择${header}...`,
                            shouldSort: false
                        });

                        // 使用 setValue 设置初始值，避免与 input.value 冲突引发重复
                        if (cellData && cellData.trim()) {
                            const initialValues = cellData.split('|').filter(Boolean);
                            console.log(`Setting initial values for ${header}:`, initialValues);
                            choices.setValue(initialValues);
                        }

                        choices.passedElement.element.addEventListener('change', (e) => {
                            currentData.allRows[rowIndex][colIndex] = choices.getValue(true).join('|');
                            
                            // 规则8-6：修改reactants或products列时，实时解析并回填到reaction_equation列中（仅对reactions tab有效）
                            if (currentTab === 'reactions') {
                                const equationIndex = currentData.headers.indexOf('reaction_equation');
                                const reactantsIndex = currentData.headers.indexOf('reactants');
                                const productsIndex = currentData.headers.indexOf('products');
                                
                                if ((colIndex === reactantsIndex || colIndex === productsIndex) && 
                                    currentData.allRows[rowIndex][reactantsIndex] && 
                                    currentData.allRows[rowIndex][productsIndex]) {
                                    
                                    const reactants = currentData.allRows[rowIndex][reactantsIndex].split('|').filter(Boolean);
                                    const products = currentData.allRows[rowIndex][productsIndex].split('|').filter(Boolean);
                                    
                                    if (reactants.length > 0 && products.length > 0) {
                                        const equation = `${reactants.join(' + ')} -> ${products.join(' + ')}`;
                                        currentData.allRows[rowIndex][equationIndex] = equation;
                                        
                                        // 更新UI
                                        const equationTd = row.cells[equationIndex];
                                        if (equationTd.querySelector('[contenteditable]')) {
                                            equationTd.querySelector('[contenteditable]').textContent = equation;
                                        }
                                    }
                                }
                            }
                        });
                        choiceInstances.push(choices);
                    } catch (e) {
                        console.error(`Error creating Choices instance for ${header}:`, e);
                        // 降级为普通编辑框
                        const div = document.createElement('div');
                        div.textContent = cellData;
                        div.setAttribute('contenteditable', 'true');
                        div.addEventListener('input', (e) => {
                            const newValue = e.target.textContent;
                            if (currentData.allRows[rowIndex]) {
                                currentData.allRows[rowIndex][colIndex] = newValue;
                            }
                        });
                        td.appendChild(div);
                    }
                } else {
                    const div = document.createElement('div');
                    div.textContent = cellData;
                    div.setAttribute('contenteditable', 'true');
                    div.addEventListener('input', (e) => {
                        const newValue = e.target.textContent;
                        if (currentData.allRows[rowIndex]) {
                            currentData.allRows[rowIndex][colIndex] = newValue;
                            
                            // 实现规则8-5和8-6：实时解析和回填（仅对reactions tab有效）
                            if (currentTab === 'reactions') {
                                const equationIndex = currentData.headers.indexOf('reaction_equation');
                                const reactantsIndex = currentData.headers.indexOf('reactants');
                                const productsIndex = currentData.headers.indexOf('products');
                                
                                // 规则8-5：修改反应方程式时，实时解析并回填到reactants和products列中
                                if (colIndex === equationIndex && newValue && newValue.includes('->')) {
                                    const parts = newValue.split('->');
                                    const clean = (s) => s.trim().replace(/^\d+/, '').replace(/[↑↓]$/, '');
                                    const format = (str) => {
                                        if (!str) return '';
                                        return str.trim().split('+').map(clean).filter(Boolean).join('|');
                                    };
                                    
                                    // 更新数据
                                    currentData.allRows[rowIndex][reactantsIndex] = format(parts[0]);
                                    currentData.allRows[rowIndex][productsIndex] = format(parts[1]);
                                
                                    // 更新UI
                                    const reactantsTd = row.cells[reactantsIndex];
                                    const productsTd = row.cells[productsIndex];
                                    
                                    // 如果是Choices实例，需要更新Choices的值
                                    if (reactantsTd.querySelector('.choices')) {
                                        const reactantsChoices = choiceInstances.find(c => 
                                            c.passedElement.element.closest('td') === reactantsTd);
                                        if (reactantsChoices) {
                                            const values = currentData.allRows[rowIndex][reactantsIndex].split('|').filter(Boolean);
                                            reactantsChoices.setValue(values);
                                        }
                                    } else if (reactantsTd.querySelector('[contenteditable]')) {
                                        reactantsTd.querySelector('[contenteditable]').textContent = currentData.allRows[rowIndex][reactantsIndex];
                                    }
                                    
                                    if (productsTd.querySelector('.choices')) {
                                        const productsChoices = choiceInstances.find(c => 
                                            c.passedElement.element.closest('td') === productsTd);
                                        if (productsChoices) {
                                            const values = currentData.allRows[rowIndex][productsIndex].split('|').filter(Boolean);
                                            productsChoices.setValue(values);
                                        }
                                    } else if (productsTd.querySelector('[contenteditable]')) {
                                        productsTd.querySelector('[contenteditable]').textContent = currentData.allRows[rowIndex][productsIndex];
                                    }
                                }
                                
                                // 规则8-6：修改reactants或products列时，实时解析并回填到reaction_equation列中
                                if ((colIndex === reactantsIndex || colIndex === productsIndex) && 
                                    currentData.allRows[rowIndex][reactantsIndex] && 
                                    currentData.allRows[rowIndex][productsIndex]) {
                                    
                                    const reactants = currentData.allRows[rowIndex][reactantsIndex].split('|').filter(Boolean);
                                    const products = currentData.allRows[rowIndex][productsIndex].split('|').filter(Boolean);
                                    
                                    if (reactants.length > 0 && products.length > 0) {
                                        const equation = `${reactants.join(' + ')} -> ${products.join(' + ')}`;
                                        currentData.allRows[rowIndex][equationIndex] = equation;
                                        
                                        // 更新UI
                                        const equationTd = row.cells[equationIndex];
                                        if (equationTd.querySelector('[contenteditable]')) {
                                            equationTd.querySelector('[contenteditable]').textContent = equation;
                                        }
                                    }
                                }
                            }
                        }
                    });
                    td.appendChild(div);
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // 添加分页控件
        const pagination = createPagination();
        if (pagination) {
            tableContainer.appendChild(pagination);
        }
    }
});