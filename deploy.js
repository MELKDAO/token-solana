const web3 = require('@solana/web3.js');
const spl = require('@solana/spl-token');

const mpl = require('@metaplex-foundation/mpl-token-metadata');
const mtp = require('@metaplex-foundation/js');
const dotenv = require('dotenv');
dotenv.config();

const endpoint = process.env.ALCHEMY_SOLANA_ENDPOINT;

const privateKey = process.env.SOLFLARE_PRIVATE_KEY;

const net = process.env.SOLANA_NETWORK;

const connection = new web3.Connection(web3.clusterApiUrl(net), 'confirmed');
const userWallet = web3.Keypair.fromSecretKey(Uint8Array.from(privateKey));

const metaplex = mtp.Metaplex.make(connection)
    .use(mtp.keypairIdentity(userWallet))
    .use(mtp.bundlrStorage({
        address: process.env.METAPLEX_BUNDLER_ADDRESS,
        providerUrl: endpoint,
        timeout: 60000,
    }));

const MINT_CONFIG = {
    numDecimals: 9,
    numberTokens: 100000000000
}

const MY_TOKEN_METADATA = {
    name: "Melk test",
    symbol: "MELKT",
    description: "This is a test token!",
    image: "https://URL_TO_YOUR_IMAGE.png" //add public URL to image you'd like to use
}

const ON_CHAIN_METADATA = {
    name: MY_TOKEN_METADATA.name, 
    symbol: MY_TOKEN_METADATA.symbol,
    uri: 'TO_UPDATE_LATER',
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
}

const uploadMetadata = async (tokenMetadata) => {
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
    console.log("Arweave URL: ", uri);
    return uri;
}

const createNewMintTransaction = async (connection, payer, mintKeypair, destinationWallet, mintAuthority, freezeAuthority) => {
    //Get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await spl.getMinimumBalanceForRentExemptMint(connection);
    //metadata account associated with mint
    const metadataPDA = await metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });
    //get associated token account of your wallet
    const tokenATA = await spl.getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);   
    

    const createNewTokenTransaction = new web3.Transaction().add(
        web3.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: spl.MINT_SIZE,
            lamports: requiredBalance,
            programId: spl.TOKEN_PROGRAM_ID,
        }),
        spl.createInitializeMintInstruction(
            mintKeypair.publicKey, //Mint Address
            MINT_CONFIG.numDecimals, //Number of Decimals of New mint
            mintAuthority, //Mint Authority
            freezeAuthority, //Freeze Authority
            spl.TOKEN_PROGRAM_ID),
        spl.createAssociatedTokenAccountInstruction(
            payer.publicKey, //Payer 
            tokenATA, //Associated token account 
            payer.publicKey, //token owner
            mintKeypair.publicKey, //Mint
        ),
        spl.createMintToInstruction(
            mintKeypair.publicKey, //Mint
            tokenATA, //Destination Token Account
            mintAuthority, //Authority
            MINT_CONFIG.numberTokens * Math.pow(10, MINT_CONFIG.numDecimals),//number of tokens
        ),
        
        mpl.createCreateMetadataAccountV3Instruction({
            metadata: metadataPDA,
            mint: mintKeypair.publicKey,
            mintAuthority: mintAuthority,
            payer: payer.publicKey,
            updateAuthority: mintAuthority,
        }, {
            createMetadataAccountArgsV3: {
                data: ON_CHAIN_METADATA,
                isMutable: true,
                collectionDetails: null
            }
        })
    );

    return createNewTokenTransaction;
}

const main = async() => {
    console.log(`---STEP 1: Uploading MetaData---`);
    let metadataUri = await uploadMetadata(MY_TOKEN_METADATA);
    ON_CHAIN_METADATA.uri = metadataUri;

    console.log(`---STEP 2: Creating Mint Transaction---`);
    let mintKeypair = web3.Keypair.generate();   
    console.log(`New Mint Address: `, mintKeypair.publicKey.toString());

    const newMintTransaction = await createNewMintTransaction(
        connection,
        userWallet,
        mintKeypair,
        userWallet.publicKey,
        userWallet.publicKey,
        userWallet.publicKey
    );

    console.log(`---STEP 3: Executing Mint Transaction---`);
    let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash('finalized');
    newMintTransaction.recentBlockhash = blockhash;
    newMintTransaction.lastValidBlockHeight = lastValidBlockHeight;
    newMintTransaction.feePayer = userWallet.publicKey;
    const transactionId = await web3.sendAndConfirmTransaction(connection,newMintTransaction,[userWallet,mintKeypair]); 
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
    console.log(`View Token Mint: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`)
}

main();