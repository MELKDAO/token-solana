const web3 = require('@solana/web3.js');
const spl = require('@solana/spl-token');


async function testSol() {
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
    const payer = web3.Keypair.generate();
    const airdropSignature = await connection.requestAirdrop(
        payer.publicKey,
        web3.LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(airdropSignature);
    
    const mintAuthority = web3.Keypair.generate();
    const freezeAuthority = web3.Keypair.generate();

    const mint = await spl.createMint(
        connection,
        payer,
        mintAuthority.publicKey,
        freezeAuthority.publicKey,
        9 // decimals
    )

    console.log(mint.toBase58())

    const mintInfo = await spl.getMint(
        connection,
        mint
    )
    
    console.log(mintInfo.supply);
    // 0

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