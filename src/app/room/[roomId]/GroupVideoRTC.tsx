"use client"

import React, { useEffect, useRef, useState } from "react"
import Peer, { SignalData } from "simple-peer"
import { socket } from "../../../socket"

interface ISignals {
  id: string
  data: SignalData
}

interface IPeer {
  id: string
  peer: Peer.Instance
}

const GroupVideoRTC = ({ roomId }: { roomId: string }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})

  const [localStream, setLocalStream] = useState<MediaStream>()

  const [peers, setPeers] = useState<IPeer[]>([])
  const peersRef = useRef<IPeer[]>([])
  const [signals, setSignals] = useState<ISignals[]>([])
  const [mySocketId, setMySocketId] = useState("")

  useEffect(() => {
    if (socket.connected && socket.id) {
      setMySocketId(socket.id)
      navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
        if (localVideoRef.current) {
          setLocalStream(stream)
          localVideoRef.current.srcObject = stream
        }
        socket.emit("group-read", { id: roomId })
        socket.on("group-read", (room: IGroupRoom) => {
          setPeers((prevPeers) => {
            room.clients?.forEach((socketId) => {
              if (socketId === socket.id) return
              const existingPeer = prevPeers.find((item) => item.id === socketId)
              const peer = createPeer(socketId, stream)
              if (existingPeer) {
                existingPeer.id = socketId
                existingPeer.peer = peer
              } else {
                const peerItem = {
                  id: socketId,
                  peer,
                }
                // peersRef.current.push(peerItem)
                prevPeers.push(peerItem)
              }
            })
            peersRef.current = prevPeers
            return prevPeers
          })
        })

        socket.on("group-call-user-joined", ({ signal, socketId }) => {
          const peer = addPeer(signal, socketId, stream)
          const peerItem = {
            id: socketId,
            peer,
          }
          //   peersRef.current.push(peerItem)
          setPeers((prevPeers) => {
            if (prevPeers.filter((item) => item.id === socketId).length > 0) {
              peersRef.current = prevPeers
              return prevPeers
            }
            peersRef.current = [...prevPeers, peerItem]
            return [...prevPeers, peerItem]
          })
        })

        socket.on("group-call-returned-signal", ({ signal, id }) => {
          const item = peersRef.current.find((p) => p.id === id)
          item?.peer.signal(signal)
        })

        socket.on("group-call-leave", ({ socketId }) => {
          setPeers((prevPeers) => prevPeers.filter((item) => item.id !== socketId))
        })
      })
    }
    return () => {
      socket.off("group-read")
    }
  }, [])

  function createPeer(socketId: string, stream: MediaStream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    })

    peer.on("signal", (signal) => {
      socket.emit("group-call-signal", { socketId, signal })
    })

    peer.on("close", () => {
      console.log("Create Peer Close ID: ", socketId)
    })

    return peer
  }

  function addPeer(signalData: Peer.SignalData, socketId: string, stream: MediaStream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    })

    peer.on("signal", (signal) => {
      socket.emit("group-call-return-signal", { signal, socketId: socketId })
    })

    peer.on("close", () => {
      console.log("Add Peer Close ID: ", socketId)
    })

    peer.signal(signalData)

    return peer
  }

  useEffect(() => {
    console.log("peersRef", peersRef)
  }, [peersRef.current])

  useEffect(() => {
    console.log("peers", peers)
  }, [peers])

  return (
    <div>
      <div>GroupVideoRTC</div>

      <div>
        <h2>Your Video: {mySocketId}</h2>
        <video ref={localVideoRef} autoPlay muted style={{ width: "300px" }} />
      </div>
      <div>
        <h2>Remote Videos</h2>
        <div className="grid grid-flow-row grid-cols-3">
          {peers.map((item, key) => {
            return (
              <div key={item.id}>
                <div>{item.id}</div>
                <Video peer={item.peer} id={item.id} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GroupVideoRTC

const Video = ({ peer }: IPeer) => {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    peer.on("stream", (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream
      }
    })
  }, [])

  return <video ref={ref} playsInline autoPlay style={{ width: "300px" }} />
}
