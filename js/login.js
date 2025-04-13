/**
 * Login Page JS
 */

onDOMContentLoaded(() => {
    // Check if user is already logged in
    requireNoAuth();
    
    // Setup form elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const emailFeedback = emailInput.parentElement.querySelector('.invalid-feedback');
    const passwordFeedback = passwordInput.parentElement.querySelector('.invalid-feedback');
    
    // Setup password toggle
    setupPasswordToggles();
    
    // Email input validation
    emailInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            this.classList.remove('is-valid', 'is-invalid');
        } else if (validateEmail(this.value)) {
            this.classList.add('is-valid');
            this.classList.remove('is-invalid');
        } else {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
            emailFeedback.textContent = 'Please enter a valid email address.';
        }
    });
    
    // Password input validation - remove error on input
    passwordInput.addEventListener('input', function() {
        if (this.value.trim() !== '') {
            this.classList.remove('is-invalid');
        }
    });
    
    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset error message
        loginError.classList.add('d-none');
        
        // Get form data
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Reset classes and feedback messages
        emailInput.classList.remove('is-invalid', 'is-valid');
        passwordInput.classList.remove('is-invalid');
        
        // Validate form
        let isValid = true;
        
        if (!email) {
            emailInput.classList.add('is-invalid');
            emailFeedback.textContent = 'Email is required.';
            isValid = false;
        } else if (!validateEmail(email)) {
            emailInput.classList.add('is-invalid');
            emailFeedback.textContent = 'Please enter a valid email address.';
            isValid = false;
        }
        
        if (!password) {
            passwordInput.classList.add('is-invalid');
            passwordFeedback.textContent = 'Please enter your password.';
            isValid = false;
        }
        
        if (!isValid) {
            return;
        }
        
        try {
            // Find user in local storage
            const user = findUserByEmail(email);
            
            // If user not found or password doesn't match
            if (!user || user.password !== password) {
                throw new Error('Invalid email or password');
            }
            
            // Simulate API call
            const loginPayload = {
                username: email,
                password: password
            };
            
            // Create a fake token
            const token = `fake-token-${Date.now()}`;
            
            // Store token and user data
            saveToken(token);
            
            // Don't store password in session storage
            const { password: _, ...userWithoutPassword } = user;
            saveUserToSession(userWithoutPassword);
            
            // Redirect to home page
            window.location.href = 'home.html';
            
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
        }
    });
});