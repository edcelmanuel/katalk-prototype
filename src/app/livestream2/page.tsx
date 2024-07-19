"use client"
import React, { useState, useRef, useEffect } from "react"
import Peer, { SignalData } from "simple-peer"
import { socket } from "../../socket"

const VideoChat = () => {
  const [peer, setPeer] = useState<Peer.Instance>()
  const [initiator, setInitiator] = useState(false)

  const [signalData, setSignalData] = useState("")
  const [receivedSignal, setReceivedSignal] = useState<string>()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const [mySocketId, setMySocketId] = useState("")
  const [remoteID, setRemoteID] = useState("")

  useEffect(() => {
    if (socket.connected && socket.id) {
      setMySocketId(socket.id)
      socket.on("peer-handshake", async ({ id, data }: { id: string; data: SignalData }) => {
        console.log(data)
        setRemoteID(id)
        peer?.signal(data)
      })
    }
    return () => {
      socket.off("peer-handshake")
    }
  }, [peer])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const p = new Peer({
        initiator: initiator,
        trickle: false,
        stream: stream,
      })

      p.on("signal", (data) => {
        console.log("signal", { id: remoteID, data })
        setSignalData(JSON.stringify(data))
      })

      p.on("stream", (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      })

      setPeer(p)
    })
  }, [initiator, remoteID])

  useEffect(() => {
    if (signalData && remoteID) {
      socket.emit("peer-handshake", { id: remoteID, data: JSON.parse(signalData) })
    }
  }, [signalData, remoteID])

  const handleStart = () => {
    setInitiator(true)
  }

  const handleConnect = () => {
    if (peer && receivedSignal) {
      peer.signal(JSON.parse(receivedSignal))
    }
  }

  return (
    <div>
      <div className="grid grid-flow-row grid-cols-2 w-full gap-4 px-4">
        <div>
          <h2>Your ID: {mySocketId}</h2>
          <video ref={localVideoRef} autoPlay muted style={{ width: "300px" }} />
        </div>
        <div>
          <h2>Remote ID: {remoteID}</h2>
          <video ref={remoteVideoRef} autoPlay style={{ width: "300px" }} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          className="input input-bordered w-full mt-4"
          onChange={(e) => setRemoteID(e.currentTarget.value)}
          value={remoteID}
        />
        <button onClick={handleStart}>Start</button>
        <textarea className="h-96" value={signalData} readOnly />
        <textarea
          className="h-96"
          value={receivedSignal}
          onChange={(e) => setReceivedSignal(e.target.value)}
        />
        <button onClick={handleConnect}>Connect</button>
      </div>
    </div>
  )
}

export default VideoChat
