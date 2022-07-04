// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START cloudrun_helloworld_service]
// [START run_helloworld_service]
require('dotenv').config();
const express = require('express');
const ethers = require("ethers");
const app = express();

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  const provider = new ethers.ethers.providers.InfuraProvider("rinkeby", "40c2813049e44ec79cb4d7e0d18de173")
  res.send(provider);
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
  provider.getTransactionReceipt(txHash)
    .then(async (tx) => {
      const log = iface.parseLog(tx.logs[2]);

      const event = {
        user: ethers.utils.getAddress(log.args.user),
        amount: log.args.amount.toString(),
        tknAddress: ethers.utils.getAddress(log.args.tknAddress),
        tknName: log.args.tknName,
        tknSymbol: log.args.tknSymbol,
        targetChainID: log.args.targetChainID.toString()
      }
      console.log(event)
      const claimHash = ethers.utils.solidityKeccak256(
        [ "string", "address", "uint", "address", "string", "string", "bytes32"], 
        [ "claimMint", event.user, event.amount, event.tknAddress, event.tknName, event.tknSymbol, txHash])
      
      const signer = getSigner(event.targetChainID)
      const sig = await signer.signMessage(ethers.utils.arrayify(claimHash));
      const sigSplit = ethers.utils.splitSignature(sig);

      res.send({
        ...event,
        txHash: txHash,
        claimHash: claimHash,
        v: sigSplit.v,
        r: sigSplit.r, 
        s: sigSplit.s
      })
    })
});

const getProvider = (targetChainID) => {
  if (targetChainID == 31337) {
    return new ethers.providers.JsonRpcProvider("http://localhost:8545");
  }
  else if (targetChainID == 3) {
    //return new ethers.providers.InfuraProvider("rinkeby", "40c2813049e44ec79cb4d7e0d18de173")
  }
  else if (targetChainID == 4) {
    return new ethers.providers.InfuraProvider("rinkeby", "40c2813049e44ec79cb4d7e0d18de173")
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
  
  console.log(`helloworld: listening on port ${port}`);
});
// [END run_helloworld_service]
// [END cloudrun_helloworld_service]

// Exports for testing purposes.
module.exports = app;
