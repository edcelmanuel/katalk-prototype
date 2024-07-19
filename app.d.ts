interface IGroupRoom {
  id?: string
  name?: string
  clients?: string[]
}

interface IClientSocket {
  id: string
  room: string[]
}
