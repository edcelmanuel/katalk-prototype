"use client"
import React, { useEffect, useRef, useState } from "react"
import { socket } from "../../socket"

const Page = () => {
  const [mainPeerConnection, setMainPeerConnection] = useState<RTCPeerConnection>()
  const localCamera = useRef<HTMLVideoElement>(null)
  const remoteCamera = useRef<HTMLVideoElement>(null)
  const [localStream, setLocalStream] = useState<MediaStream>()

  const [isConnected, setIsConnected] = useState(false)
  const [mySocket, setMySocket] = useState("")
  const [receiptSocket, setReceiptSocket] = useState<string>("")

  useEffect(() => {
    ;(async () => {
      if (localCamera.current) {
        const localStreamx = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        localCamera.current.srcObject = localStreamx
        setLocalStream(localStreamx)
      }
      if (socket.connected) {
        setIsConnected(true)
        setMySocket(socket?.id ?? "")
        socket.emit("join", "room1")
        socket.on("user-joined", (payload) => {
          setReceiptSocket(payload.userId)
          socket.emit("handshake", payload.userId)
        })
        socket.on("handshake", (payload) => {
          setReceiptSocket(payload.userId)
        })
      }
    })()
  }, [localCamera])

  useEffect(() => {
    if (mySocket && receiptSocket) {
      socket.on("offer", (payload) => {
        createAnswer(receiptSocket, payload.offer)
      })
      socket.on("answer", (payload) => {
        addAnswer(payload.answer)
      })
      socket.on("candidate", (payload) => {
        if (mainPeerConnection) {
          mainPeerConnection.addIceCandidate(payload.candidate)
        }
      })
    }
  }, [mySocket, receiptSocket, mainPeerConnection])

  const createPeerConnection = (userId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"] }],
    })

    const remoteStream = new MediaStream()
    if (remoteCamera.current) {
      remoteCamera.current.srcObject = remoteStream
    }

    localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = async (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
      })
    }

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        socket.emit("candidate", { userId: userId, candidate: event.candidate })
      }
    }

    return peerConnection
  }

  const createOffer = async (sendToUserId: string) => {
    const peerConnection = createPeerConnection(sendToUserId)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    socket.emit("offer", { userId: sendToUserId, offer: offer })
    setMainPeerConnection(peerConnection)
  }

  const createAnswer = async (sendToUserId: string, offer: any) => {
    const peerConnection = createPeerConnection(sendToUserId)
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    socket.emit("answer", { userId: sendToUserId, answer: answer })
    setMainPeerConnection(peerConnection)
  }

  const addAnswer = async (answer: any) => {
    if (!mainPeerConnection?.currentRemoteDescription) {
      mainPeerConnection?.setRemoteDescription(answer)
    }
  }

  return (
    <div>
      <div>
        <p>Status: {isConnected ? "connected" : "disconnected"}</p>
      </div>
      <div className="grid grid-flow-row grid-cols-1 xl:grid-cols-2 w-full gap-4 px-4">
        <div className="w-full h-full rounded-lg overflow-hidden">
          <video
            ref={localCamera}
            className="aspect-video bg-slate-500 -scale-x-100 w-full h-full"
            id="user-1"
            autoPlay
            playsInline
            muted
          ></video>
        </div>
        <div className="w-full h-full rounded-lg overflow-hidden">
          <video
            ref={remoteCamera}
            className="aspect-video bg-slate-500 w-full h-full"
            id="user-2"
            autoPlay
            playsInline
          ></video>
        </div>
      </div>
      <div>My ID: {mySocket}</div>
      <div>Recipient ID: {receiptSocket}</div>

      <div className="btn btn-primary" onClick={() => createOffer(receiptSocket)}>
        Send Offer
      </div>
    </div>
  )
}

export default Page
