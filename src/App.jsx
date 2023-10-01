//nodes
import React, { useState } from "react";
import { ethers } from "ethers";
import Papa from "papaparse";
import axios from "axios";
import QRCode from "qrcode.react";
import styled from "styled-components";
import { useEthers } from "@usedapp/core";
//
//user
import "./App.css";
import CONTRACTADDRESS, { APIKEY } from "./Components/addresses";
import StudentABI from "./Components/StudentABI.json";
import iconImage from "./Components/icon.png";
import iconImag from "./Components/BBT.png";
//
function App() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [message1, setMessage1] = useState("");
  const [message, setMessage] = useState("Connect-Wallet to Mint the Student");
  const [mbulk, setMbulk] = useState("");
  const [csvResults, setCsvResults] = useState([]);
  const [transactionHash, setTransactionHash] = useState("");
  const [tokenadd, setTokenadd] = useState("");

  const contractAddress = CONTRACTADDRESS;
  const contractABI = StudentABI;
  //for connect wallet
  const { activateBrowserWallet, account, deactivate } = useEthers();
  async function connectAndActivate() {
    await connectToEthereum();
    await activateBrowserWallet();
  }
  async function disconnectWallet() {
    try {
      await deactivate();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  }
  async function connectToEthereum() {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        setProvider(provider);

        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          provider.getSigner()
        );
        setContract(contract);

        const signer = provider.getSigner();
        const from = await signer.getAddress();
        const domain = window.location.host;
        const exampleMessage = `${domain} wants you to sign in with your Ethereum account:\n ${from}\n\nI accept the MetaMask Terms of Service: https://community.metamask.io/tos\n\nURI: https://${domain}\nVersion: 1\nChain ID: 1\nNonce: 32891757\nIssued At: 2021-09-30T16:25:24.000Z`;
        const encoder = new TextEncoder();
        const data = encoder.encode(exampleMessage);
        const msg = exampleMessage;
        const sign = await window.ethereum.request({
          method: "personal_sign",
          params: [msg, from],
        });
        // console.log("Personal Sign Result:", sign);
        // console.log("Contract initialized successfully:", contract);
      } else {
        alert("Please install MetaMask or use a Web3-enableder.");
      }
    } catch (error) {
      alert("Error connecting to Ethereum:", error);
    }
  }
  //

  //for get all list from contract
  async function getAllStudents() {
    try {
      if (contract) {
        console.log(contract);
        const totalStudents = await contract.methods.TotalStudents().call();
        const studentDetails = [];

        for (let i = 0; i < totalStudents; i++) {
          const studentId = i;
          const result = await contract.methods
            .getStudentDetails(studentId)
            .call();
          studentDetails.push(
            `Student ID: ${studentId}, Name: ${result[0]}, ID: ${result[1]}`
          );
        }
        console.log(studentDetails);
      } else {
        alert("Contract not initialized.");
      }
    } catch (error) {
      console.error("Error getting students:", error);
      alert("Error getting students. Check the console for more details.");
    }
  }
  //for verification
  async function getStudent() {
    try {
      if (contract) {
        const result = await contract.getStudentDetails(studentId);
        setMessage(`Student ID:${result[1]} , Name:  ${result[0]}`);
      } else {
        alert("Contract not initialized.");
      }
    } catch (error) {
      alert("Error getting student:", error);
    }
  } //

  //for bulk
  async function handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }
    const results = await new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          console.error("CSV Parsing Error:", error.message);
          resolve([]);
        },
      });
    });
    setCsvResults(results);
  } //

  //bulk button
  async function processCSVData() {
    setMessage("Waiting for Mint");
    try {
      if (contract) {
        for (const student of csvResults) {
          const { id, name } = student;
          const tx = await contract.mintStudent(name, id);
          const receipt = await tx.wait();
          //api
          const transactionHash = tx.hash;
          // const apiKey = APIKEY;
          // const polygonScanUrl = `https://api.polygonscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${transactionHash}&apikey=${apiKey}`;
          const apiKey = APIKEY;
          const goerli = `https://api-goerli.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${transactionHash}&apikey=${apiKey}`;
          const response = await axios.get(goerli);
          setTransactionHash(transactionHash);
          // console.log(transactionHash);
          if (response.data.status === "1") {
            setMessage(
              `Student minted successfully. Token ID: ${receipt.events[0].args.tokenId}`
            );
            setTokenadd(receipt.events[0].args.tokenId);
            setMessage1(`Transaction Hash is : ${transactionHash}`);
          } else if (response.data.status === "0") {
            setMessage("Api execution failed.");
          } else {
            setMessage("Transaction status is unknown.");
          } //api
        }
        setMessage("Bulk upload successful");
      } else {
        alert("Contract not initialized.");
      }
    } catch (error) {
      console.error("Error adding students:", error);
      alert("Error adding students. Check the console for more details.");
    }
  } //

  //currently working single upload
  const data = {
    newStudentName,
    newStudentId,
  };
  async function addStudent() {
    setMessage("Waiting for Mint");
    try {
      if (contract) {
        //function call
        const tx = await contract.mintStudent(newStudentName, newStudentId);
        axios
          .post("/push/students", data)
          .then((response) => {
            console.log("Response from server:", response.data);
          })
          .catch((error) => {
            console.error("Error:", error);
          });
        const receipt = await tx.wait();
        setMessage("Student minted successfully.");
        //api
        const transactionHash = tx.hash;
        // const apiKey = APIKEY;
        // const polygonScanUrl = `https://api.polygonscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${transactionHash}&apikey=${apiKey}`;
        const apiKey = APIKEY;
        const goerli = `https://api-goerli.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${transactionHash}&apikey=${apiKey}`;
        const response = await axios.get(goerli);
        setTransactionHash(transactionHash);
        // console.log(transactionHash);
        if (response.data.status === "1") {
          setMessage(
            `Student minted successfully. Token ID: ${receipt.events[0].args.tokenId}`
          );
          setTokenadd(receipt.events[0].args.tokenId);
          setMessage1(`Transaction Hash is : ${transactionHash}`);
        } else if (response.data.status === "0") {
          setMessage("Api execution failed.");
        } else {
          setMessage("Transaction status is unknown.");
        } //api
      } else {
        alert("Contract not initialized.");
      }
    } catch (error) {
      console.error("Error adding student:", error);
    }
  }
  //

  return (
    <div className="App">
      <footer
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={iconImage} alt="Icon" />
        {/* <h1>CIPHER CERT</h1> */}
      </footer>

      {account ? (
        <CButton onClick={() => disconnectWallet()}>
          {account.slice(0, 4)}...{account.slice(account.length - 4)}
        </CButton>
      ) : (
        <CButton onClick={() => connectAndActivate()}>Connect Wallet</CButton>
      )}

      <h1>Issuance Portal</h1>
      <Container>
        <Overlay>
          <Content>
            <h2>Single upload</h2>
            <label>Student ID</label>
            <input
              type="number"
              value={newStudentId}
              onChange={(e) => setNewStudentId(e.target.value)}
            />
            <label>Student Name</label>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
            />
            <button onClick={addStudent}>Add-Student</button>
          </Content>
        </Overlay>
        <Overlay>
          <Content>
            <Dis>
              <div id="qr">
                {transactionHash && (
                  <QRCode
                    value={`https://goerli.etherscan.io/tx/${transactionHash}`}
                    renderAs="svg"
                    size={128}
                  />
                )}
              </div>
            </Dis>
          </Content>
        </Overlay>
        <Overlay>
          <Content>
            <h2>Bulk upload</h2>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
            <button onClick={processCSVData}>Add-Student</button>
          </Content>
        </Overlay>
      </Container>
      <Dis>
        <p>{message}</p>
        <p> {message1}</p>
        <p>{mbulk}</p>
      </Dis>

      <Footer>
        <img src={iconImag} alt="Icon" />
        <h3>Copyright © 2023 - Byte Blitz Tech</h3>
      </Footer>
    </div>
  );
}

export default App;

const CButton = styled.button`
  cursor: pointer;
  padding: 0.7rem 2rem;
  background-color: grey;
  border-radius: 50px;
  color: rgb(255, 255, 255);
  font-weight: 500;
  margin-left: 7rem;
`;

const Dis = styled.div`
  display: flex;
  align-items: center;
  max-width: 1280px;
  width: 80%;
  margin: 0 auto;
  padding: 1.5rem 0;
  position: relative;
  flex-direction: column;
  flex-wrap: nowrap;
`;

const Footer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  // margin-right: 40rem;
  img {
    height: 80px;
    width: 80px;
    margin-left: 1rem;
  }
`;
//
const Content = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-direction: column;
  align-items: flex-start;
  button {
    cursor: pointer;
    margin-top: 1rem;
    padding: 0.2rem 2rem;
    background-color: black;
    border-radius: 50px;
    color: rgb(255, 255, 255);
  }
`;

const Container = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: auto;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Overlay = styled.div`
  width: 20%;
  padding: 20px;
  border-radius: 25px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
  flex-direction: column;
  align-items: center;

  @media (max-width: 768px) {
    width: 70%;
    margin-bottom: 1rem;
  }
`;
