// scripts/emailValidator.js
import config from './config.js';

// Funzione per la validazione base dell'email
function basicEmailValidation(email) {
    const errors = [];
    
    if (!email) {
        errors.push('L\'indirizzo email è obbligatorio');
        return { isValid: false, errors };
    }

    if (email.length < 5) {
        errors.push('L\'indirizzo email è troppo corto');
    }
    if (email.length > 254) {
        errors.push('L\'indirizzo email è troppo lungo');
    }

    // Verifica che config.emailValidation.emailRegex esista prima di usarlo
    const emailRegex = config?.emailValidation?.emailRegex || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
        errors.push('Il formato dell\'email non è valido');
        return { isValid: false, errors };
    }

    const domain = email.split('@')[1].toLowerCase();
    
    // Verifica che config.emailValidation.temporaryDomains esista prima di usarlo
    const temporaryDomains = config?.emailValidation?.temporaryDomains || [];
    if (temporaryDomains.includes(domain)) {
        errors.push('Gli indirizzi email temporanei non sono ammessi');
    }

    if (domain) {
        if (domain.includes('..')) {
            errors.push('Il dominio non può contenere punti consecutivi');
        }
        if (!/^[a-z0-9.-]+$/.test(domain)) {
            errors.push('Il dominio contiene caratteri non validi');
        }
        const domainParts = domain.split('.');
        if (domainParts.some(part => part.length > 63)) {
            errors.push('Una parte del dominio è troppo lunga');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Modificato per gestire errori di rete
async function checkMXRecord(email) {
    try {
        const domain = email.split('@')[1];
        const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
        
        if (!response.ok) {
            console.warn('MX check failed, continuing with validation:', response.statusText);
            return { isValid: true, error: null };
        }
        
        const data = await response.json();
        const hasMX = data.Answer && data.Answer.length > 0;
        
        return {
            isValid: hasMX,
            error: hasMX ? null : 'Questo dominio email non ha un server di posta valido'
        };
    } catch (error) {
        console.warn('MX check error, continuing with validation:', error);
        return { isValid: true, error: null };
    }
}

// Funzione principale di validazione
async function validateEmail(email) {
    try {
        const basicValidation = basicEmailValidation(email);
        if (!basicValidation.isValid) {
            return basicValidation;
        }

        // MX check is now optional - if it fails, we still allow the email
        const mxCheck = await checkMXRecord(email);
        if (!mxCheck.isValid && mxCheck.error) {
            console.warn('MX validation failed:', mxCheck.error);
            // We still return valid=true to allow the form submission
            return { isValid: true, errors: [] };
        }

        return { isValid: true, errors: [] };
    } catch (error) {
        console.error('Email validation error:', error);
        // In case of unexpected errors, we allow the form to submit
        return { isValid: true, errors: [] };
    }
}

export { validateEmail };
