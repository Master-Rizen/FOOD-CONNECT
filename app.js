// Global variables
let currentUserType = 'user';
let currentRestaurantName = '';
let userClaims = [];
let listingToDelete = null;

// Sort and Filter varibles ...... 
let currentSort = 'newest';
let currentFilters = {
    category: '',
    delivery: false,
    pickup: true,
    maxPrice: 1000
};

//loading spinner
function showLoading(show) {
    document.getElementById('loadingSpinner').classList.toggle('hidden', !show);
}

// Show notification 
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg z-50 notification ${type} slide-in-right`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="ri-${type === 'success' ? 'check' : type === 'error' ? 'close' : 'information'}-line"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// redirecting to pages according to there details
function showPage(pageId) {
    console.log('🔄 Showing page:', pageId);
    ['loginPage', 'userDashboard', 'ownerDashboard'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

// Users Section 
function showUserSection(section) {
    const browseSection = document.getElementById('browseSection');
    const claimsSection = document.getElementById('claimsSection');
    const browseBtn = document.getElementById('browseBtn');
    const claimsBtn = document.getElementById('claimsBtn');

    if (section === 'browse') {
        browseSection.classList.remove('hidden');
        claimsSection.classList.add('hidden');
        browseBtn.classList.add('bg-opacity-20');
        browseBtn.classList.remove('bg-opacity-10');
        claimsBtn.classList.add('bg-opacity-10');
        claimsBtn.classList.remove('bg-opacity-20');
    } else {
        browseSection.classList.add('hidden');
        claimsSection.classList.remove('hidden');
        browseBtn.classList.add('bg-opacity-10');
        browseBtn.classList.remove('bg-opacity-20');
        claimsBtn.classList.add('bg-opacity-20');
        claimsBtn.classList.remove('bg-opacity-10');
        loadUserClaims();
    }
}

// Modal functions  
function openCreateModal() {
    document.getElementById('createListingModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('createListingModal').classList.add('hidden');
    document.getElementById('listingForm').reset();
    // Reset image preview
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imagePlaceholder').classList.remove('hidden');
    document.getElementById('foodImage').value = '';
}

function openDeleteModal(listingId) {
    listingToDelete = listingId;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    listingToDelete = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

// Password toggle
function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const toggleButton = passwordField.nextElementSibling;
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleButton.innerHTML = '<i class="ri-eye-off-line"></i>';
    } else {
        passwordField.type = 'password';
        toggleButton.innerHTML = '<i class="ri-eye-line"></i>';
    }
}

// Image preview of food item
function previewImage(input) {
    const placeholder = document.getElementById('imagePlaceholder');
    const preview = document.getElementById('imagePreview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Uploading image to my database
async function uploadFoodImage(file) {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('food-images')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Image upload error:', error);
        return 'https://images.unsplash.com/photo-1509440159596-0249088772ff';
    }
}

// Food listing validation
function validateFoodListing(formData) {
    const errors = [];
    
    if (!formData.description?.trim()) {
        errors.push('Food description is required');
    }
    
    if (!formData.price || formData.price < 1) {
        errors.push('Price must be at least ₹1');
    }
    
    if (!formData.quantity || formData.quantity < 1) {
        errors.push('Quantity must be at least 1');
    }
    
    if (!formData.pickupTime?.trim()) {
        errors.push('Pickup time is required');
    }
    
    if (!formData.category) {
        errors.push('Category is required');
    }
    
    return errors;
}
// Coupon verification function at restarent page
async function verifyCoupon() {
    const couponCode = document.getElementById('couponCode').value.trim().toUpperCase();
    const resultDiv = document.getElementById('couponResult');
    
    // Clear previous results
    resultDiv.innerHTML = '';
    resultDiv.classList.add('hidden');
    
    if (!couponCode) {
        resultDiv.innerHTML = `
            <div class="coupon-info rounded-lg p-4">
                <i class="ri-information-line mr-2"></i>
                Please enter a coupon code
            </div>
        `;
        resultDiv.classList.remove('hidden');
        return;
    }

    showLoading(true);
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) {
            showNotification('Please sign in to verify coupons', 'error');
            showLoading(false);
            return;
        }

        console.log('🔍 Verifying coupon:', couponCode, 'for owner:', user.user.id);

        // For data base entry in ro page
        const { data: listings, error } = await supabase
            .from('food_listings')
            .select('*')
            .eq('created_by', user.user.id)
            .eq('is_available', false);

        if (error) {
            console.error('Query error:', error);
            throw error;
        }

        console.log('📋 Found', listings?.length, 'claimed listings');
        
        // Manually search for the coupon code
        const validListing = listings?.find(listing => 
            listing.confirmation_code === couponCode
        );

        if (validListing) {
            console.log('✅ Found valid listing:', validListing);
            
            // Get claimant name
            let claimantName = 'Charan';
            if (validListing.claimed_by) {
                const { data: claimant } = await supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('id', validListing.claimed_by)
                    .single();
                claimantName = claimant?.full_name || 'Charan';
            }

            resultDiv.innerHTML = `
                <div class="coupon-valid rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-bold text-lg">✅ Valid Coupon</h3>
                        <span class="text-2xl font-bold">${couponCode}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div><strong>Food Item:</strong> ${validListing.description}</div>
                        <div><strong>Claimed By:</strong> ${claimantName}</div>
                        <div><strong>Price:</strong> ₹${validListing.price}</div>
                        <div><strong>Pickup Time:</strong> ${validListing.pickup_time}</div>
                        <div><strong>Claimed On:</strong> ${new Date(validListing.updated_at).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        } else {
            console.log('❌ Coupon not found. Available codes:', listings?.map(l => l.confirmation_code));
            resultDiv.innerHTML = `
                <div class="coupon-invalid rounded-lg p-4">
                    <i class="ri-close-circle-line mr-2"></i>
                    Invalid coupon code: <strong>${couponCode}</strong><br>
                    <span class="text-sm">Please check the code and try again.</span>
                </div>
            `;
        }
        
        resultDiv.classList.remove('hidden');

    } catch (error) {
        console.error('❌ Coupon verification error:', error);
        resultDiv.innerHTML = `
            <div class="coupon-invalid rounded-lg p-4">
                <i class="ri-error-warning-line mr-2"></i>
                Error verifying coupon. Please try again.
            </div>
        `;
        resultDiv.classList.remove('hidden');
    }
    showLoading(false);
}

// Sort and Filter functions
function openSortMenu() {
    const sortMenu = document.getElementById('sortMenu');
    sortMenu.classList.toggle('hidden');
    
    setTimeout(() => {
        const closeOutside = (e) => {
            if (!e.target.closest('#sortBtn') && !e.target.closest('#sortMenu')) {
                sortMenu.classList.add('hidden');
                document.removeEventListener('click', closeOutside);
            }
        };
        document.addEventListener('click', closeOutside);
    }, 0);
}

function applySort(sortType) {
    currentSort = sortType;
    document.getElementById('sortMenu').classList.add('hidden');
    
    const sortText = {
        'newest': 'Newest',
        'price_low': 'Price: Low to High',
        'price_high': 'Price: High to Low',
        'distance': 'Nearest'
    };
    
    document.getElementById('sortBtn').innerHTML = `<i class="ri-sort-desc mr-2"></i>${sortText[sortType]}`;
    loadUserFoodListings();
}

function openFilterMenu() {
    const filterMenu = document.getElementById('filterMenu');
    filterMenu.classList.toggle('hidden');
    
    setTimeout(() => {
        const closeOutside = (e) => {
            if (!e.target.closest('#filterMenu') && !e.target.closest('.relative > button')) {
                filterMenu.classList.add('hidden');
                document.removeEventListener('click', closeOutside);
            }
        };
        document.addEventListener('click', closeOutside);
    }, 0);
}

function applyFilters() {
    const category = document.getElementById('filterCategory').value;
    const delivery = document.getElementById('filterDelivery').checked;
    const pickup = document.getElementById('filterPickup').checked;
    const maxPrice = document.getElementById('filterPrice').value;

    currentFilters = {
        category: category,
        delivery: delivery,
        pickup: pickup,
        maxPrice: parseInt(maxPrice)
    };

    document.getElementById('filterMenu').classList.add('hidden');
    loadUserFoodListings();
}

function clearFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterDelivery').checked = false;
    document.getElementById('filterPickup').checked = true;
    document.getElementById('filterPrice').value = 1000;
    document.getElementById('priceValue').textContent = '1000';
    applyFilters();
}

// Debounce search functionality used onlw when filter failes
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toggle between signup and login 
function toggleForm() {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const toggleBtn = document.getElementById('toggleFormBtn');
    
    if (signupForm.classList.contains('hidden')) {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        toggleBtn.textContent = 'Already have an account? Sign In';
    } else {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        toggleBtn.textContent = "Don't have an account? Sign Up";
    }
}

// Set user type (user or owner in the database)
function setUserType(type) {
    console.log('🎯 Setting user type to:', type);
    currentUserType = type;
    const userBtn = document.getElementById('userTypeBtn');
    const ownerBtn = document.getElementById('ownerTypeBtn');
    const restaurantField = document.getElementById('restaurantField');
    
    if (type === 'user') {
        userBtn.classList.add('border-green-500', 'text-green-500', 'bg-green-50');
        userBtn.classList.remove('border-gray-300', 'text-gray-500');
        ownerBtn.classList.add('border-gray-300', 'text-gray-500');
        ownerBtn.classList.remove('border-purple-500', 'text-purple-500', 'bg-purple-50');
        restaurantField.classList.add('hidden');
    } else {
        ownerBtn.classList.add('border-purple-500', 'text-purple-500', 'bg-purple-50');
        ownerBtn.classList.remove('border-gray-300', 'text-gray-500');
        userBtn.classList.add('border-gray-300', 'text-gray-500');
        userBtn.classList.remove('border-green-500', 'text-green-500', 'bg-green-50');
        restaurantField.classList.remove('hidden');
    }
}

// Sign up function 

async function signUp() {
    showLoading(true);
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const restaurantName = document.getElementById('restaurantName').value;

    if (!email || !password || !fullName) {
        showNotification('Please fill in all required fields', 'error');
        showLoading(false);
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        showLoading(false);
        return;
    }
    
    if (currentUserType === 'owner' && !restaurantName) {
        showNotification('Please enter your restaurant name', 'error');
        showLoading(false);
        return;
    }

    try {
        console.log('🚀 STARTING SIGNUP - User type:', currentUserType);
        
        //Creatung user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    user_type: currentUserType,
                    full_name: fullName,
                    restaurant_name: restaurantName
                }
            }
        });

        if (authError) throw authError;
        
        if (authData.user) {
            console.log('✅ Auth user created:', authData.user.id);
            
            // when user failed to create account it retrys here 
            let profileCreated = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!profileCreated && retryCount < maxRetries) {
                try {
                    console.log(`🔄 Attempting profile creation (attempt ${retryCount + 1})`);
                    
                    const { data: profileData, error: profileError } = await supabase
                        .from('user_profiles')
                        .insert([
                            {
                                id: authData.user.id,
                                user_type: currentUserType,
                                full_name: fullName
                            }
                        ])
                        .select();

                    if (profileError) {
                        console.error(`❌ Profile creation attempt ${retryCount + 1} failed:`, profileError);
                        
                        // If it's an RLS error, wait and retry(from database)
                        if (profileError.code === '42501' && retryCount < maxRetries - 1) {
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                            continue;
                        }
                        throw profileError;
                    }
                    
                    profileCreated = true;
                    console.log('✅ Profile created successfully:', profileData);
                    
                } catch (profileError) {
                    if (retryCount >= maxRetries - 1) {
                        // Last attempt failed, try alternative approach
                        console.log('🔄 Trying alternative profile creation method...');
                        
                        // Use rpc if available, or continue without profile (it will be created on login)
                        showNotification('Account created! Please sign in to complete setup.', 'success');
                        showLoading(false);
                        return;
                    }
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Step 3: Creating owner
            if (currentUserType === 'owner' && profileCreated) {
                console.log('🏪 Creating restaurant...');
                const { data: restaurant, error: restaurantError } = await supabase
                    .from('restaurants')
                    .insert([
                        {
                            owner_id: authData.user.id,
                            name: restaurantName,
                            address: 'Address to be updated',
                            cuisine_type: 'Various'
                        }
                    ])
                    .select()
                    .single();

                if (restaurantError) {
                    console.error('❌ Restaurant creation error:', restaurantError);
                    showNotification('Account created! Restaurant setup will complete on sign in.', 'warning');
                } else {
                    currentRestaurantName = restaurant.name;
                    localStorage.setItem('currentRestaurant', restaurant.name);
                    console.log('✅ Restaurant created:', restaurant.name);
                }
            }

            if (profileCreated) {
                showNotification('Account created successfully! You are now signed in.', 'success');
                await initializeDashboard(authData.user, fullName, restaurantName);
            } else {
                showNotification('Account created! Please sign in to complete setup.', 'success');
                showPage('loginPage');
            }
        }

    } catch (error) {
        console.error('❌ Sign up error:', error);
        
        if (error.message.includes('row-level security policy')) {
            showNotification('Account created! Please sign in to complete setup.', 'success');
            showPage('loginPage');
        } else {
            showNotification('Error creating account: ' + error.message, 'error');
        }
    }
    
    showLoading(false);
}

// Login 
async function login() {
    showLoading(true);
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        showLoading(false);
        return;
    }

    try {
        console.log('🔐 Attempting login...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Login successful, user:', data.user.id);
        await initializeDashboard(data.user);

    } catch (error) {
        console.error('❌ Login error:', error);
        showNotification('Error signing in: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Check user data in  database 
async function debugUserData(userId) {
    console.log('🔍 DEBUG USER DATA:');
    
    // Check auth user
    const { data: authUser } = await supabase.auth.getUser();
    console.log('Auth user:', authUser);
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    console.log('User profile:', profile);
    console.log('Profile error:', profileError);
    
    // Check restaurants data in databae
    const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', userId);
    
    console.log('Restaurants:', restaurants);
    console.log('Restaurant error:', restaurantError);
    
    return { profile, restaurants };
}

// dashboard for user type only 
async function initializeDashboard(user, userName = 'User', restaurantName = '') {
    try {
        console.log('🎯 INITIALIZING DASHBOARD FOR USER:', user.id);
        
        // Check all user data
        const debugData = await debugUserData(user.id);
        console.log('🔍 Debug data:', debugData);
        
        // Get user profile to determine type (user or owner verification)
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('user_type, full_name')
            .eq('id', user.id)
            .single();

        console.log('📋 Profile query result:', profile);
        console.log('📋 Profile query error:', error);

        let userType = 'user';
        let displayName = userName || user.email;

        if (error) {
            console.error('❌ Profile fetch error - creating default profile');
            
            // Try to get user type from auth metadata first
            userType = user.user_metadata?.user_type || 'user';
            displayName = user.user_metadata?.full_name || userName || user.email;
            
            console.log('🔧 Using user type from metadata:', userType);
            
            // Create profile with correct type
            const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert([
                    {
                        id: user.id,
                        user_type: userType,
                        full_name: displayName
                    }
                ])
                .select()
                .single();
            
                if (createError) {
                console.error('❌ Profile creation error:', createError);
                // Still proceed with determined type
            } else {
                console.log('✅ Created profile:', newProfile);
                profile = newProfile; // Use the new profile
            }
        } else {
            // Use the profile data
            userType = profile.user_type;
            displayName = profile.full_name || displayName;
        }

        console.log('🎭 Final user type:', userType);
        console.log('👤 Display name:', displayName);
        
        // imp-- owner dashboard if detrminrd as owner
        if (userType === 'owner') {
            console.log('🚀 ROUTING TO OWNER DASHBOARD');
            
            // Get restaurant name for owner
            const { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .select('name')
                .eq('owner_id', user.id)
                .single();
            
            console.log('🏪 Restaurant data:', restaurant);
            console.log('🏪 Restaurant error:', restaurantError);
            
            if (!restaurantError && restaurant) {
                currentRestaurantName = restaurant.name;
                localStorage.setItem('currentRestaurant', restaurant.name);
                console.log('✅ Restaurant name set:', currentRestaurantName);
            } else {
                currentRestaurantName = restaurantName || user.user_metadata?.restaurant_name || 'Your Restaurant';
                console.log('⚠️ Using fallback restaurant name:', currentRestaurantName);
            }
            
            await initializeOwnerDashboard(user, displayName);
        } else {
            console.log('🚀 ROUTING TO USER DASHBOARD');
            await initializeUserDashboard(user, displayName);
        }

    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        // Fallback to user dashboard with detailed error info
        console.log('🔄 Falling back to user dashboard due to error');
        await initializeUserDashboard(user, userName);
    }
}

// Loading food listings for users witj sort and filer
async function loadUserFoodListings(searchTerm = '') {
    try {
        let query = supabase
            .from('food_listings')
            .select('*')
            .eq('is_available', true)
            .is('deleted_at', null);

        // Apply search filter
        if (searchTerm) {
            query = query.or(`description.ilike.%${searchTerm}%,restaurant_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
        }

        switch(currentSort) {
            case 'price_low':
                query = query.order('price', { ascending: true });
                break;
            case 'price_high':
                query = query.order('price', { ascending: false });
                break;
            case 'distance':
                query = query.order('distance_km', { ascending: true });
                break;
                default:
                query = query.order('created_at', { ascending: false });
        }

        if (currentFilters.category) {
            query = query.eq('category', currentFilters.category);
        }
        if (currentFilters.delivery) {
            query = query.eq('delivery_available', true);
        }
        if (currentFilters.pickup) {
            query = query.eq('pickup_available', true);
        }
        if (currentFilters.maxPrice) {
            query = query.lte('price', currentFilters.maxPrice);
        }

        const { data: listings, error } = await query;

        if (error) throw error;

        const container = document.getElementById('userFoodListings');
        
        if (!listings || listings.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8 text-gray-500">
                    <i class="ri-restaurant-line text-4xl mb-2"></i>
                    <p>No food available with current filters.</p>
                    <button onclick="clearFilters()" class="text-green-500 hover:text-green-600 mt-2">Clear filters</button>
                </div>
            `;
            return;
        }

        container.innerHTML = listings.map(listing => `
            <div class="bg-white rounded-lg shadow border p-6 card-hover">
                <div class="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <img src="${listing.image_url}" alt="${listing.description}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1509440159596-0249088772ff'">
                </div>
                <h3 class="font-bold text-lg mb-2">${listing.restaurant_name}</h3>
                <p class="text-gray-600 mb-2">${listing.description}</p>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-green-600 font-bold text-xl">₹${listing.price}</span>
                    <span class="text-sm text-gray-500">${listing.distance_km} km away</span>
                </div>
                <div class="flex justify-between items-center mb-4">
                    <span class="text-sm text-gray-600">Pickup: ${listing.pickup_time}</span>
                    <span class="text-xs px-2 py-1 rounded-full ${listing.delivery_available ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}">
                        ${listing.delivery_available ? 'Delivery' : 'Pickup Only'}
                    </span>
                </div>
                <div class="mb-3">
                    <span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">${listing.category}</span>
                </div>
                <button onclick="claimFood('${listing.id}', '${listing.restaurant_name}', '${listing.description}', ${listing.price})" class="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                    Claim Now
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading food listings:', error);
        document.getElementById('userFoodListings').innerHTML = `
            <div class="col-span-3 text-center py-8 text-red-500">
                <p>Error loading food listings. Please try again.</p>
            </div>
        `;
    }
}

// Load user claims
async function loadUserClaims() {
    const container = document.getElementById('userClaimsList');
    
    if (userClaims.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-shopping-bag-line text-4xl mb-2"></i>
                <p>You haven't claimed any food yet.</p>
                <p class="text-sm">Browse available food and make your first claim!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = userClaims.map(claim => `
        <div class="bg-white rounded-lg shadow border p-6 card-hover">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-gray-900">${claim.restaurantName}</h3>
                    <p class="text-gray-600">${claim.description}</p>
                </div>
                <span class="text-lg font-bold text-green-600">₹${claim.price}</span>
            </div>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-yellow-800 mb-1">${claim.code}</div>
                    <div class="text-sm text-yellow-700">Verification Code</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                    <strong>Pickup Time:</strong><br>
                    ${claim.pickupTime}
                </div>
                <div>
                    <strong>Claimed On:</strong><br>
                    ${new Date(claim.claimedAt).toLocaleDateString()}
                </div>
            </div>
            
            <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                <p class="text-sm text-blue-800">
                    <i class="ri-information-line mr-1"></i>
                    Show this code at <strong>${claim.restaurantName}</strong> to collect your food between <strong>${claim.pickupTime}</strong>
                </p>
            </div>
        </div>
    `).join('');
}

// Load owners food listings and data
async function loadOwnerData(user) {
    try {
        const { data: listings, error } = await supabase
            .from('food_listings')
            .select('*')
            .eq('created_by', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const activeListings = listings.filter(l => l.is_available).length;
        const totalClaims = listings.filter(l => !l.is_available).length;
        const revenue = listings.filter(l => !l.is_available)
                              .reduce((sum, listing) => sum + parseFloat(listing.price), 0);

        document.getElementById('activeListings').textContent = activeListings;
        document.getElementById('mealsSaved').textContent = totalClaims;
        document.getElementById('revenueEarned').textContent = `₹${revenue}`;
        document.getElementById('listingsCount').textContent = `${listings.length} listing${listings.length !== 1 ? 's' : ''}`;

        const container = document.getElementById('ownerFoodListings');
        
        if (!listings || listings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="ri-restaurant-line text-4xl mb-2"></i>
                    <p>No food listings yet. Create your first listing!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = listings.map(listing => `
            <div class="border rounded-lg p-4 mb-4 card-hover ${listing.is_available ? 'bg-white' : 'bg-gray-50'}">
                <div class="flex gap-4">
                    <div class="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="${listing.image_url}" alt="${listing.description}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1509440159596-0249088772ff'">
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <h3 class="font-bold text-lg">${listing.restaurant_name}</h3>
                                <p class="text-gray-600">${listing.description}</p>
                            </div>
                            <div class="flex items-start gap-2">
                                <span class="text-lg font-bold text-purple-600">₹${listing.price}</span>
                                <button onclick="openDeleteModal('${listing.id}')" class="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50" title="Delete listing">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex justify-between items-center text-sm text-gray-500 mb-2">
                            <span>Category: ${listing.category}</span>
                            <span>Qty: ${listing.quantity}</span>
                            <span>Pickup: ${listing.pickup_time}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm ${listing.is_available ? 'text-green-600' : 'text-gray-500'}">
                                ${listing.is_available ? 'Available' : 'Claimed'}
                            </span>
                            <div class="flex gap-2">
                                ${listing.delivery_available ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Delivery</span>' : ''}
                                ${listing.pickup_available ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Pickup</span>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading owner data:', error);
    }
}

// Delete listing function by database
async function confirmDelete() {
    if (!listingToDelete) return;
    
    showLoading(true);
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
            showNotification('Please sign in to delete listings', 'error');
            showLoading(false);
            return;
        }

        const { error } = await supabase
            .from('food_listings')
            .delete()
            .eq('id', listingToDelete)
            .eq('created_by', user.user.id);

        if (error) throw error;

        showNotification('Food listing deleted successfully!', 'success');
        closeDeleteModal();
        
        await loadOwnerData(user.user);
        
    } catch (error) {
        console.error('Delete listing error:', error);
        showNotification('Error deleting listing: ' + error.message, 'error');
    }
    showLoading(false);
}

// starting user dashboard
async function initializeUserDashboard(user, userName = 'User') {
    console.log('🎯 INITIALIZING USER DASHBOARD');
    showPage('userDashboard');
    document.getElementById('userWelcome').textContent = `Welcome, ${userName}!`;
    await loadUserFoodListings();
    const savedClaims = localStorage.getItem(`foodClaims_${user.id}`);
    if (savedClaims) {
        userClaims = JSON.parse(savedClaims);
    }
}

// starting owner dashboard
async function initializeOwnerDashboard(user, userName = 'Owner') {
    console.log('🎯 INITIALIZING OWNER DASHBOARD');
    showPage('ownerDashboard');
    document.getElementById('ownerWelcome').textContent = `Welcome, ${userName}!`;
    
    if (currentRestaurantName && currentRestaurantName !== 'Your Restaurant') {
        document.getElementById('ownerDashboardTitle').textContent = `${currentRestaurantName} Dashboard`;
    } else {
        document.getElementById('ownerDashboardTitle').textContent = 'Restaurant Dashboard';
    }
    
    await loadOwnerData(user);
}

// Handling food listing creation
document.getElementById('listingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await createFoodListing();
});

// Create food listing for owners .
async function createFoodListing() {
    showLoading(true);
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
            showNotification('Please sign in to create listings', 'error');
            showLoading(false);
            return;
        }

        // load restaurant name from database for owners
        if (currentUserType === 'owner') {
            const { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .select('name')
                .eq('owner_id', user.user.id)
                .single();

            if (restaurantError) {
                console.error('Error loading restaurant:', restaurantError);
                showNotification('Error loading restaurant information. Please try again.', 'error');
                showLoading(false);
                return;
            }

            if (restaurant && restaurant.name) {
                currentRestaurantName = restaurant.name;
                localStorage.setItem('currentRestaurant', restaurant.name);
            } else {
                showNotification('No restaurant found for your account. Please contact support.', 'error');
                showLoading(false);
                return;
            }
        }

        const description = document.getElementById('foodDescription').value;
        const price = document.getElementById('foodPrice').value;
        const category = document.getElementById('foodCategory').value;
        const quantity = document.getElementById('foodQuantity').value;
        const pickupTime = document.getElementById('pickupTime').value;
        const deliveryAvailable = document.getElementById('deliveryAvailable').checked;
        const pickupAvailable = document.getElementById('pickupAvailable').checked;
        const imageFile = document.getElementById('foodImage').files[0];

        // Validate form data
        const formData = {
            description,
            price,
            category,
            quantity,
            pickupTime
        };

        const validationErrors = validateFoodListing(formData);
        if (validationErrors.length > 0) {
            showNotification(validationErrors.join(', '), 'error');
            showLoading(false);
            return;
        }

        // Upload image if provided
        let imageUrl = 'https://images.unsplash.com/photo-1509440159596-0249088772ff';
        if (imageFile) {
            imageUrl = await uploadFoodImage(imageFile);
        }

        const { error } = await supabase.from('food_listings').insert([
            {
                restaurant_name: currentRestaurantName,
                description: description,
                price: parseFloat(price),
                category: category,
                quantity: parseInt(quantity),
                pickup_time: pickupTime,
                delivery_available: deliveryAvailable,
                pickup_available: pickupAvailable,
                distance_km: (Math.random() * 5 + 0.5).toFixed(1),
                image_url: imageUrl,
                created_by: user.user.id,
                is_available: true
            }
        ]);

        if (error) throw error;

        showNotification('Food listing created successfully!', 'success');
        closeModal();
        
        await loadOwnerData(user.user);
        
    } catch (error) {
        console.error('Create listing error:', error);
        showNotification('Error creating listing: ' + error.message, 'error');
    }
    showLoading(false);
}

// Claim food function 
async function claimFood(listingId, restaurantName, description, price) {
    showLoading(true);
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
            showNotification('Please sign in to claim food', 'error');
            showLoading(false);
            return;
        }

        const { data: listing } = await supabase
            .from('food_listings')
            .select('pickup_time')
            .eq('id', listingId)
            .single();

        const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { error } = await supabase
            .from('food_listings')
            .update({ 
                is_available: false, 
                claimed_by: user.user.id,
                confirmation_code: confirmationCode,
                updated_at: new Date().toISOString()
            })
            .eq('id', listingId);

        if (error) throw error;

        const claim = {
            id: listingId,
            restaurantName: restaurantName,
            description: description,
            price: price,
            pickupTime: listing.pickup_time,
            code: confirmationCode,
            claimedAt: new Date().toISOString()
        };

        userClaims.unshift(claim);
        localStorage.setItem(`foodClaims_${user.user.id}`, JSON.stringify(userClaims));

        showNotification(`Food claimed successfully! Confirmation Code: ${confirmationCode}`, 'success');
        
        await loadUserFoodListings();
        showUserSection('claims');
        
    } catch (error) {
        showNotification('Error claiming food: ' + error.message, 'error');
    }
    showLoading(false);
}

// Logout 
async function logout() {
    showLoading(true);
    await supabase.auth.signOut();
    showPage('loginPage');
    
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('toggleFormBtn').textContent = 'Already have an account? Sign In';
    
    // Reset variables
    currentUserType = 'user';
    currentRestaurantName = '';
    userClaims = [];
    
    showLoading(false);
}

// Check if user is already logged in
async function checkAuth() {
    showLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await initializeDashboard(user);
        } else {
            showPage('loginPage');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showPage('loginPage');
    }
    showLoading(false);
}

// initializing project me - 1 
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('userTypeBtn').addEventListener('click', () => setUserType('user'));
    document.getElementById('ownerTypeBtn').addEventListener('click', () => setUserType('owner'));
    
    // Add  search
    const debouncedSearch = debounce((searchTerm) => {
        loadUserFoodListings(searchTerm);
    }, 300);

    document.getElementById('searchInput').addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
    
    checkAuth();
});



// 234,241,1085 to be checked for modifiaction
// 73-94 database model