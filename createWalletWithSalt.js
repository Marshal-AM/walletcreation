const { ethers } = require('ethers');
const crypto = require('crypto');
const readline = require('readline');

/**
 * Creates an Ethereum wallet using a salt for additional security
 * @param {string} salt - A string to use as salt for wallet generation
 * @param {Object} options - Additional options
 * @param {boolean} options.use24Words - Use 24 words mnemonic instead of 12
 * @returns {Object} Wallet information including address, private key, and mnemonic
 */
function createWalletWithSalt(salt, options = {}) {
  // Validate input
  if (!salt || typeof salt !== 'string') {
    throw new Error('Salt must be a non-empty string');
  }

  const { use24Words = false } = options;

  try {
    // Create a deterministic seed by hashing the salt
    const saltBuffer = Buffer.from(salt);
    const hash = crypto.createHash('sha256').update(saltBuffer).digest();
    
    // Determine entropy size based on desired mnemonic length
    // 16 bytes (128 bits) = 12 words
    // 32 bytes (256 bits) = 24 words
    const entropySize = use24Words ? 32 : 16;
    const entropy = hash.slice(0, entropySize);
    
    // Generate mnemonic from entropy
    const mnemonic = ethers.utils.entropyToMnemonic(entropy);
    
    // Create wallet from mnemonic
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);

    // Return wallet information
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      wordCount: use24Words ? 24 : 12,
      salt: salt
    };
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
}

/**
 * Runs the interactive CLI for wallet creation
 */
async function runInteractiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('=== Ethereum Wallet Generator with Salt ===\n');
    
    // Get salt from user
    const userSalt = await question('Enter a salt value (this should be kept secret): ');
    if (!userSalt) {
      console.error('Salt cannot be empty');
      rl.close();
      return;
    }

    // Ask about mnemonic length
    const mnemonicChoice = await question('Do you want a 24-word mnemonic? (y/N): ');
    const use24Words = mnemonicChoice.toLowerCase() === 'y';

    // Generate wallet
    const wallet = createWalletWithSalt(userSalt, { use24Words });
    
    console.log('\n=== Your Wallet Details ===');
    console.log('Ethereum Address:', wallet.address);
    console.log('Private Key:', wallet.privateKey);
    console.log(`Mnemonic (${wallet.wordCount} words):`, wallet.mnemonic);
    console.log('\nIMPORTANT: Keep your private key, mnemonic, and salt secure!');
    console.log('Anyone with access to your private key or mnemonic can access your funds.');
    
    // Verify reproducibility
    console.log('\n=== Verification ===');
    console.log('Creating the same wallet again with your salt...');
    const verificationWallet = createWalletWithSalt(userSalt, { use24Words });
    console.log('Verification successful:', wallet.address === verificationWallet.address);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

// Check if script is run directly (not imported)
if (require.main === module) {
  // If arguments provided, use those
  if (process.argv.length > 2) {
    const salt = process.argv[2];
    const use24Words = process.argv.includes('--24words');
    
    try {
      const wallet = createWalletWithSalt(salt, { use24Words });
      
      console.log('Wallet created with salt:');
      console.log('Address:', wallet.address);
      console.log('Private Key:', wallet.privateKey);
      console.log(`Mnemonic (${wallet.wordCount} words):`, wallet.mnemonic);
      
      // Verify reproducibility
      const sameWallet = createWalletWithSalt(salt, { use24Words });
      console.log('\nSame wallet generated:', wallet.address === sameWallet.address);
    } catch (error) {
      console.error('Error creating wallet:', error.message);
    }
  } else {
    // No arguments, run interactive CLI
    runInteractiveCLI();
  }
}

// Export the function for use in other scripts
module.exports = { createWalletWithSalt }; 
