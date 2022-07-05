require('dotenv').config();
const express = require('express');
const ethers = require("ethers");
const app = express();

app.get('/', (req, res) => {
  res.send("Hello to The ERC20Validator! use /mint?sourceChainId={nativeChainID}&txHash={yourTx} /burn?sourceChainId={wrappedTknChainID}&txHash={yourTx}");
});

app.get('/mint', (req, res) => {
  var sourceChainId = req.query.sourceChainId;
  var txHash = req.query.txHash;
  const provider =  getProvider(sourceChainId);
  if (!provider) {
    res.send("invalid source chain");
    return;
  }
  let abi = ["event TokenLocked(address indexed user, uint amount, address tknAddress, string tknName, string tknSymbol,uint targetChainID)"]
  let iface = new ethers.utils.Interface(abi);
  console.log("test")
  provider.getTransactionReceipt(txHash)
    .then(async (tx) => {
      let log;
      for (let i in tx.logs) {
        try{
          log = iface.parseLog(tx.logs[i]);
          break;
        }
        catch{}
      }

      if(!log) {
        res.send("This is not a lock transaction!")
      }

      const event = {
        user: ethers.utils.getAddress(log.args.user),
        amount: log.args.amount.toString(),
        tknAddress: ethers.utils.getAddress(log.args.tknAddress),
        tknName: log.args.tknName,
        tknSymbol: log.args.tknSymbol,
        targetChainID: log.args.targetChainID.toString()
      }

      const claimHash = ethers.utils.solidityKeccak256(
        [ "string", "address", "uint", "address", "uint", "string", "string", "bytes32"], 
        [ "claimMint", event.user, event.amount, event.tknAddress, sourceChainId, event.tknName, event.tknSymbol, txHash])
      
      const signer = getSigner(event.targetChainID)
      const sig = await signer.signMessage(ethers.utils.arrayify(claimHash));
      const sigSplit = ethers.utils.splitSignature(sig);

      res.send({
        ...event,
        txHash: txHash,
        nativeChainId: sourceChainId,
        claimHash: claimHash,
        v: sigSplit.v,
        r: sigSplit.r, 
        s: sigSplit.s
      })
    }).catch((er) => res.send(er))
});

app.get('/burn', (req, res) => {
  var sourceChainId = req.query.sourceChainId;
  var txHash = req.query.txHash;
  const provider =  getProvider(sourceChainId);
  if (!provider) {
    res.send("invalid source chain");
    return;
  }
  let abi = ["event TokenBurned(address indexed user, uint amount, address nativeTknAddress, uint nativeChainId)"]
  let iface = new ethers.utils.Interface(abi);
  provider.getTransactionReceipt(txHash)
    .then(async (tx) => {
      let log;
      for (let i in tx.logs) {
        try{
          log = iface.parseLog(tx.logs[i]);
          break;
        }
        catch{}
      }

      if(!log) {
        res.send("This is not a burn transaction!")
      }

      const event = {
        user: ethers.utils.getAddress(log.args.user),
        amount: log.args.amount.toString(),
        nativeTknAddress: ethers.utils.getAddress(log.args.nativeTknAddress),
        nativeChainId: log.args.nativeChainId.toString()
      }

      const claimHash = ethers.utils.solidityKeccak256(
        [ "string", "address", "uint", "address", "bytes32"], 
        [ "claimUnlock", event.user, event.amount, event.nativeTknAddress, txHash])
      
      const signer = getSigner(event.nativeChainId)
      const sig = await signer.signMessage(ethers.utils.arrayify(claimHash));
      const sigSplit = ethers.utils.splitSignature(sig);

      res.send({
        ...event,
        txHash: txHash,
        nativeChainId: sourceChainId,
        claimHash: claimHash,
        v: sigSplit.v,
        r: sigSplit.r, 
        s: sigSplit.s
      })
    }).catch((er) => res.send(er))
});

const getProvider = (targetChainID) => {
  if (targetChainID == 31337) {
    return new ethers.providers.JsonRpcProvider("http://localhost:8545");
  }
  else if (targetChainID == 3) {
    return new ethers.providers.InfuraProvider("ropsten", "310cd3dfc7aa4145a10b689ee5bfa044")
  }
  else if (targetChainID == 4) {
    return new ethers.providers.InfuraProvider("rinkeby", "310cd3dfc7aa4145a10b689ee5bfa044")
  }
}

const getSigner = (targetChainID) => {
  if (targetChainID == 31337) {
    //public 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    return new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  }
  else if (targetChainID == 3) {
    return new ethers.Wallet(process.env.PRIVATE_KEY_ROPSTEN)
  }
  else if (targetChainID == 4) {
    return new ethers.Wallet(process.env.PRIVATE_KEY_RINKEBY)
  }
}

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  
});


module.exports = app;
