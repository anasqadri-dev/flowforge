import { renderSettingsPanel } from './settings-panel.js';

export function initNodes() {
    const boxes = document.querySelectorAll('.box-item');
    const canvas = document.getElementById('canvas');
    const searchBox = document.getElementById('search-box');

    if (!canvas) return;

    // 1. Search
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            boxes.forEach(box => {
                box.style.display = box.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }

    // 2. Drag Start
    boxes.forEach(box => {
        box.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', box.textContent.trim());
        });
    });

    canvas.addEventListener('dragover', (e) => e.preventDefault());

    // 3. Drop Node
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        let boxName = e.dataTransfer.getData('text/plain');
        if (!boxName) return;
        boxName = boxName.replace(/[▶🌐⚙📝⏳🔀🔁🔔📄⏱]/g, '').trim();

        // Icon nikalo
        let icon = '⚙';
        const nameLower = boxName.toLowerCase();
        if (nameLower.includes('http')) icon = '🌐';
        else if (nameLower.includes('wait')) icon = '⏳';
        else if (nameLower.includes('condition')) icon = '🔀';
        else if (nameLower.includes('start')) icon = '▶';
        else if (nameLower.includes('timer')) icon = '⏱';
        else if (nameLower.includes('notification')) icon = '🔔';
        else if (nameLower.includes('variable')) icon = '📝';
        else if (nameLower.includes('loop')) icon = '🔁';
        else if (nameLower.includes('transform')) icon = '⚙';
        else if (nameLower.includes('log')) icon = '📄';

        const newNode = document.createElement('div');
        newNode.className = 'canvas-node';
        newNode.innerHTML = `
            <span class="icon">${icon}</span> 
            <span class="node-text">${boxName}</span>
            <button class="delete-btn">×</button>
            <div class="dot dot-left"></div>
            <div class="dot dot-right"></div>
        `;
        
        newNode.style.left = e.offsetX + 'px';
        newNode.style.top = e.offsetY + 'px';
        canvas.appendChild(newNode);
        
        if (document.querySelector('.canvas-hint')) {
            document.querySelector('.canvas-hint').style.display = 'none';
        }

        makeDraggable(newNode);

        // 4. Node Click (Show Settings)
        newNode.addEventListener('click', (event) => {
            if (event.target.classList.contains('dot') || event.target.classList.contains('delete-btn')) return;
            event.stopPropagation();

            const settingsContainer = document.getElementById('settings-container');
            if (settingsContainer) {
                settingsContainer.style.display = 'block'; 
                settingsContainer.innerHTML = renderSettingsPanel(boxName);
                const closeBtn = document.getElementById('close-settings');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => settingsContainer.style.display = 'none');
                }

                setTimeout(() => {
                    const form = document.getElementById('settings-form');
                    if (form) {
                        form.addEventListener('submit', (ev) => {
                            ev.preventDefault();
                            const formData = new FormData(form);
                            const data = Object.fromEntries(formData.entries());
                            
                            let newText = boxName;
                            if (data['http-url']) newText += ` (${data['http-method']})`;
                            else if (data['wait-time']) newText += ` (${data['wait-time']}s)`;

                            newNode.querySelector('.node-text').textContent = newText;
                            settingsContainer.style.display = 'none'; 
                            alert("Saved!"); 
                        });
                    }
                }, 10);
            }
        });

        // Delete Node
        newNode.querySelector('.delete-btn').addEventListener('click', (ev) => {
            ev.stopPropagation();
            newNode.remove();
        });

        // === 5. Dot se drag karke line khinchne ka logic ===
        const rightDot = newNode.querySelector('.dot-right');
        const svgLayer = document.getElementById('svg-layer');
        let isDrawing = false;
        let currentPath = null;

        rightDot.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDrawing = true;

            // Start point (Center se)
            const startX = newNode.offsetLeft + (newNode.offsetWidth / 2);
            const startY = newNode.offsetTop + (newNode.offsetHeight / 2);

            currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            currentPath.setAttribute("stroke", "#4f46e5");
            currentPath.setAttribute("stroke-width", "2");
            currentPath.setAttribute("stroke-dasharray", "5,5"); 
            currentPath.setAttribute("fill", "none");
            svgLayer.appendChild(currentPath);

            function onMouseMove(e) {
                if (!isDrawing) return;
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const d = `M ${startX} ${startY} C ${startX + 50} ${startY}, ${mouseX - 50} ${mouseY}, ${mouseX} ${mouseY}`;
                currentPath.setAttribute("d", d);
            }

            function onMouseUp(e) {
                isDrawing = false;
                currentPath.remove(); 
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                const targetNode = e.target.closest('.canvas-node');
                if (targetNode && targetNode !== newNode) {
                    drawConnection(newNode, targetNode); 
                }
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}
function getPathD(src, tgt) {
    // Source ke upar wale kinare ka center
    const x1 = src.offsetLeft + (src.offsetWidth / 2);
    const y1 = src.offsetTop; 
    
    // Target ke upar wale kinare se 10px pehle ruk jayenge (taake arrow bahar dikhe)
    const x2 = tgt.offsetLeft + (tgt.offsetWidth / 2);
    const y2 = tgt.offsetTop - 10; 

    // Seedhi line
    return `M ${x1} ${y1} L ${x2} ${y2}`;
}

// Move Function
function makeDraggable(element) {
    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('dot') || e.target.classList.contains('delete-btn')) return;
        
        let startX = e.clientX - element.offsetLeft;
        let startY = e.clientY - element.offsetTop;

        function onMouseMove(e) {
            element.style.left = (e.clientX - startX) + 'px';
            element.style.top = (e.clientY - startY) + 'px';

            // Lines ko update karo
            if (element.connections) {
                element.connections.forEach(conn => {
                    if (conn.isSource) {
                        conn.path.setAttribute("d", getPathD(element, conn.otherNode));
                    } else {
                        conn.path.setAttribute("d", getPathD(conn.otherNode, element));
                    }
                });
            }
        }
        
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Draw Connection
function drawConnection(node1, node2) {
    const svg = document.getElementById('svg-layer');
    if(!svg) return;
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    path.setAttribute("d", getPathD(node1, node2));
    path.setAttribute("stroke", "#4f46e5");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("marker-end", "url(#arrowhead)"); 

    // Line Select & Delete logic
    path.style.pointerEvents = 'stroke';
    path.style.cursor = 'pointer';

    path.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('#svg-layer path').forEach(p => p.setAttribute("stroke", "#4f46e5"));
        path.setAttribute("stroke", "#ff4444");
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && path.getAttribute("stroke") === "#ff4444") {
            path.remove();
        }
    });

    svg.appendChild(path);

    // Right-click se delete
    path.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        path.remove();
    });

    // Nodes ke sath connect karo
    if (!node1.connections) node1.connections = [];
    if (!node2.connections) node2.connections = [];
    
    node1.connections.push({ path: path, otherNode: node2, isSource: true });
    node2.connections.push({ path: path, otherNode: node1, isSource: false });
}