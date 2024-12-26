const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const ethereum_address = require("ethereum-address");
const contractABI = require("./contractABI.json");

async function sendPoints({
  points,
  consumerId,
  transferType,
  description,
  // expiresAt
}) {
  //Web3(RPC Sepolia)
  const web3 = new Web3(process.env.RPC_SEPOLIA);
  //Address is metamask public address
  let fromAddress = process.env.FROM_ADDRESS;
  //PrivateKey is metamask metamask private key
  let privateKey = process.env.WALLET_PRIVATE_KEY;
  //ContractAddress is smart contract address
  let contractAddress = process.env.CONTRACT_ADDRESS;
    //Points expiry date
    const expiresAt = null;

  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  let bufferedKey = ethUtil.toBuffer(privateKey);
  if (
    ethereum_address.isAddress(fromAddress) &&
    ethereum_address.isAddress(contractAddress) &&
    ethUtil.isValidPrivate(bufferedKey)
  ) {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const tx_builder = contract.methods.storeTransaction(
      1,
      transferType, // transferType
      consumerId.toString(), // customerId
      consumerId.toString(), // merchantId
      points.toString(), // _loyaltyNumber
      "23", // _value (Each point cost)
      0, //_expiresAt 0 mean NO EXPIRY
      description // _comment
    );
    const encoded_tx = tx_builder.encodeABI();
    const gasPrice = await web3.eth.getGasPrice();
    const count = await web3.eth.getTransactionCount(fromAddress);
    const transactionObject = {
      nonce: web3.utils.toHex(count),
      from: fromAddress,
      gasPrice: web3.utils.toHex(gasPrice),
      gasLimit: web3.utils.toHex(229720),
      to: contractAddress,
      data: encoded_tx,
      chainId: process.env.CHAIN_ID,
    };
    const signedTx = await web3.eth.accounts.signTransaction(
      transactionObject,
      privateKey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    if (receipt?.status === true) {
      return receipt?.transactionHash;
    }
  } else {
    throw new Error("Your private or public address is not correct");
  }
}

module.exports = sendPoints;
