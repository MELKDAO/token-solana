const web3 = require('@solana/web3.js');
const spl = require('@solana/spl-token');

const dotenv = require('dotenv');
dotenv.config();

async function testSol() {
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
    const payer =  web3.Keypair.fromSecretKey(Uint8Array.from(privateKey));
    console.log(payer.publicKey.toBase58());

    const mint = new web3.PublicKey(process.env.MINT_ADDRESS);

    console.log(mint.toBase58())

    const mintInfo = await spl.getMint(
        connection,
        mint
    )
    
    console.log(mintInfo.supply);

    const tokenAccount = await spl.getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    )

    console.log(tokenAccount.address.toBase58());

    const tokenAccountInfo = await spl.getAccount(
        connection,
        tokenAccount.address
    )

    console.log(tokenAccountInfo.amount);

    await spl.mintTo(
        connection,
        payer,
        mint,
        tokenAccount.address,
        mintAuthority,
        100000000000 // because decimals for the mint are set to 9 
    )

    const mintInfo2 = await spl.getMint(
        connection,
        mint
    )
    
    console.log(mintInfo2.supply);
    // 100
    
    const tokenAccountInfo2 = await spl.getAccount(
        connection,
        tokenAccount.address
    )
    
    console.log(tokenAccountInfo2.amount);
    // 100
}

testSol();