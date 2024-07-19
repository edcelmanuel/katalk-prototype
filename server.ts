import express from "express"
import { createServer } from "http"
import { Server, Socket } from "socket.io"
import next from "next"
import { v4 as uuidv4 } from "uuid"

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()
  const httpServer = createServer(server)
  const io = new Server(httpServer)

  // Middleware to serve Next.js pages
  server.get("*", (req, res) => {
    return handle(req, res)
  })

  // Socket.io connection
  io.on("connection", (socket) => {
    // p2p(socket)

    clientSockets[socket.id] = {
      id: socket.id,
      room: [],
    }

    socket.on("disconnect", () => {
      clientSockets[socket.id].room.forEach((roomid) => {
        console.log("Disconnected From Room: ", roomid)
        const room = groupRooms.find((room) => room.id === roomid)
        if (room) {
          var socketIds = Array.from(io.sockets.adapter.rooms.get(roomid) ?? [])
          room.clients = socketIds
          io.emit("group-list", groupRooms)
          socket.to(roomid).emit("group-read", room)
          socket.to(roomid).emit("group-call-leave", { socketId: socket.id })
        }
      })
    })

    groupInit(io, socket)
    socket.on("peer-handshake", ({ id, data }) => {
      socket.to(id).emit("peer-handshake", { id: socket.id, data })
    })
  })

  // Start server
  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })
})

const clientSockets: { [key: string]: IClientSocket } = {}

let groupRooms: IGroupRoom[] = [
  { id: uuidv4(), name: "Room 1", clients: ["kjasdkxbzjz", "kjasdkxbzjz", "kjasdkxbzjz"] },
]

const p2p = (socket: Socket) => {
  socket.join("room1")

  socket.on("join", (room) => {
    socket.join("room1")
    socket.broadcast.emit("user-joined", { userId: socket.id })
    console.log("User: ", socket.id, " Joined Room:", room)
  })

  socket.on("handshake", (userId) => {
    socket.to(userId).emit("handshake", { userId: socket.id })
  })

  socket.on("offer", (payload) => {
    socket.to(payload.userId).emit("offer", { offer: payload.offer })
  })

  socket.on("answer", (payload) => {
    socket.to(payload.userId).emit("answer", { answer: payload.answer })
  })

  socket.on("candidate", (payload) => {
    socket.to(payload.userId).emit("candidate", { candidate: payload.candidate })
  })
}

const groupInit = (io: Server, socket: Socket) => {
  socket.on("group-create", ({ name }: IGroupRoom) => {
    groupRooms.push({ id: uuidv4(), name, clients: [] })
    io.emit("group-list", groupRooms)
  })

  socket.on("group-read", ({ id }: IGroupRoom) => {
    const foundGroupRoom = groupRooms.find((room) => room.id === id)
    socket.emit("group-read", foundGroupRoom)
  })

  socket.on("group-list", () => {
    socket.emit("group-list", groupRooms)
  })

  socket.on("group-delete", ({ id }: IGroupRoom) => {
    groupRooms = groupRooms.filter((room) => room.id !== id)
    socket.emit("group-list", groupRooms)
  })

  socket.on("group-join", async ({ id }: IGroupRoom) => {
    const room = groupRooms.find((room) => room.id === id)
    if (room && id) {
      socket.join(id)
      clientSockets[socket.id].room.push(id)
      var socketIds = Array.from(io.sockets.adapter.rooms.get(id) ?? [])
      room.clients = socketIds
      console.log("Joining Room: ", id)
      socket.emit("group-join", { status: "success", room })
      socket.to(id).emit("group-join", { status: "success", room })
      socket.to(id).emit("group-join-user", { status: "success", userId: socket.id })
      io.emit("group-list", groupRooms)
    }
  })

  socket.on("group-leave", ({ id }: IGroupRoom) => {
    const room = groupRooms.find((room) => room.id === id)
    if (room && id) {
      socket.leave(id ?? "")
      var socketIds = Array.from(io.sockets.adapter.rooms.get(id) ?? [])
      room.clients = socketIds
      socket.to(id).emit("group-read", room)
      io.emit("group-list", groupRooms)
      socket.to(id).emit("group-call-leave", { socketId: socket.id })
    }
  })

  socket.on("group-call-signal", ({ socketId, signal }) => {
    io.to(socketId).emit("group-call-user-joined", {
      signal: signal,
      socketId: socket.id,
    })
  })

  socket.on("group-call-return-signal", ({ socketId, signal }) => {
    io.to(socketId).emit("group-call-returned-signal", {
      signal: signal,
      id: socket.id,
    })
  })
}
