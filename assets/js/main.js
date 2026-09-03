const API_URL = 'https://script.google.com/macros/s/AKfycby13G_NMNAHL2gCgRN7-kKQoQeEl32-kUyUnH7p2TIjPe1PWY0mLs2IY24a4kGb2QI/exec';

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

function formatPrice(price) {
    return new Intl.NumberFormat('th-TH').format(price);
}

function isMobile() {
    return window.innerWidth < 640;
}

async function fetchProducts() {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('product-grid');

    if (API_URL === 'https://script.google.com/macros/s/AKfycbzfTnO85of4jC-Puh6SnM6b5gVGxAcOUi7RRxVVt0lN0xNJMG7GfbTXsuI3dEzMdKU/exec') {
        loading.innerHTML = `<div class="text-red-500 text-center w-full col-span-1 sm:col-span-2 lg:col-span-3 py-4 text-sm">กรุณาตั้งค่า API_URL ในไฟล์ main.js ก่อนใช้งาน</div>`;
        return;
    }

    try {
        // เพิ่ม timeout 20 วินาที ป้องกันค้างหมุนนานเกินไป
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        const result = await response.json();

        if (result.status === 'success') {
            renderProducts(result.data);
        } else {
            loading.innerHTML = `<div class="text-red-500 text-center text-sm py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        loading.innerHTML = `
            <div class="text-center py-8 px-4">
                <div class="text-gray-400 text-sm mb-4">โหลดสินค้าไม่สำเร็จ ลองใหม่อีกครั้ง</div>
                <button onclick="fetchProducts()" class="px-6 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-colors">
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        `;
    }
}

function renderProducts(products) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('product-grid');
    
    loading.classList.add('hidden');
    grid.classList.remove('hidden');

    if (products.length === 0) {
        grid.innerHTML = `<div class="text-gray-400 text-center col-span-1 sm:col-span-2 lg:col-span-3 py-10 text-sm">ยังไม่มีสินค้าในระบบ</div>`;
        return;
    }

    let html = '';
    products.forEach((product, index) => {
        let priceHtml = '';
        if (product.SalePrice && product.SalePrice < product.FullPrice) {
            priceHtml = `
                <div class="flex items-center gap-2 mb-3 sm:mb-4">
                    <span class="text-gray-400 line-through text-xs sm:text-sm">฿${formatPrice(product.FullPrice)}</span>
                    <span class="text-lg sm:text-xl font-bold text-purple-600">฿${formatPrice(product.SalePrice)}</span>
                </div>
            `;
        } else {
            priceHtml = `
                <div class="flex items-center gap-2 mb-3 sm:mb-4">
                    <span class="text-lg sm:text-xl font-bold text-purple-600">฿${formatPrice(product.FullPrice || 0)}</span>
                </div>
            `;
        }

        html += `
            <div class="product-card bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm border border-gray-100 cursor-pointer" onclick="showProductDetail(${index})">
                <div class="product-image-container relative h-52 sm:h-64 w-full bg-gray-100">
                    <img src="${product.ImageUrl || 'https://via.placeholder.com/400x500?text=No+Image'}" 
                         alt="${product.Name}" 
                         class="w-full h-full object-cover"
                         loading="lazy">
                    ${product.SalePrice < product.FullPrice ? '<div class="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">ลดราคา</div>' : ''}
                </div>
                
                <div class="p-4 sm:p-5 flex flex-col flex-grow">
                    <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-1 leading-snug">${product.Name}</h3>
                    <p class="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">${product.Description}</p>
                    
                    ${priceHtml}

                    <button class="mt-auto w-full text-center py-2.5 bg-purple-600 active:bg-purple-700 hover:bg-purple-700 text-white text-sm font-medium rounded-full transition-colors">
                        ดูรายละเอียด
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
    window.__products = products;
}

function showProductDetail(index) {
    const product = window.__products[index];
    if (!product) return;
    let priceHtml = '';
    if (product.SalePrice && product.SalePrice < product.FullPrice) {
        priceHtml = `
            <div class="flex items-baseline gap-2 mb-4">
                <span class="text-gray-400 line-through text-base">฿${formatPrice(product.FullPrice)}</span>
                <span class="text-2xl font-bold text-purple-600">฿${formatPrice(product.SalePrice)}</span>
            </div>
        `;
    } else {
        priceHtml = `
            <div class="flex items-baseline gap-2 mb-4">
                <span class="text-2xl font-bold text-purple-600">฿${formatPrice(product.FullPrice || 0)}</span>
            </div>
        `;
    }

    const modalHtml = `
        <div id="product-modal" class="fixed inset-0 z-[100] items-center justify-center p-0 sm:p-4" style="display:flex;">
            <div class="absolute inset-0 bg-black/60" id="product-modal-backdrop"></div>
            <div class="relative bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl shadow-2xl overflow-y-auto">
                <button id="product-modal-close" class="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 shadow transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>

                <div class="relative h-72 sm:h-80 w-full bg-gray-100">
                    <img src="${product.ImageUrl || 'https://via.placeholder.com/400x500?text=No+Image'}" 
                         alt="${product.Name}" 
                         class="w-full h-full object-cover">
                    ${product.SalePrice < product.FullPrice ? '<div class="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">ลดราคา</div>' : ''}
                </div>

                <div class="p-5 sm:p-6 pb-6">
                    <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-snug">${product.Name}</h3>
                    
                    ${priceHtml}

                    <div class="border-t border-gray-100 pt-4 mb-4">
                        <h4 class="text-sm font-semibold text-gray-500 mb-2">รายละเอียดสินค้า</h4>
                        <p class="text-gray-600 text-sm leading-relaxed whitespace-pre-line">${product.Description}</p>
                    </div>

                    <div class="flex flex-col gap-2.5 mt-2">
                        ${product.SampleLink ? 
                            `<a href="${product.SampleLink}" target="_blank" class="w-full text-center py-3 border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors text-sm font-medium rounded-full">
                                ดูตัวอย่างสินค้า
                            </a>` : ''
                        }
                        
                        <a href="https://line.me/ti/p/keJXpCgpfA" target="_blank" class="w-full text-center py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-full flex items-center justify-center gap-2">
                            <i class="fab fa-line text-lg"></i> สั่งซื้อผ่าน LINE
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('product-modal-close').addEventListener('click', closeProductDetail);
    document.getElementById('product-modal-backdrop').addEventListener('click', closeProductDetail);
}

function closeProductDetail() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.remove();
    }
}
