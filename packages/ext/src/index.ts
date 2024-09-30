export * from "./utils/api"
export * from "./utils/util"

// type Identity = {
//   user_id: string
//   client_id: string
//   session_id: string
// }

// export async function genIdentity(): Promise<Identity> {
//   try {
//     const twoYearsLater = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2
//     let cid = await chrome.cookies.get({
//       url: HOME_URL,
//       name: "_client_id",
//     })

//     if (!cid) {
//       cid = await chrome.cookies.set({
//         url: HOME_URL,
//         domain: COOKIE_DOMAIN,
//         expirationDate: twoYearsLater,
//         name: "_client_id",
//         value: crypto.randomUUID(),
//       })
//     }
//     let uid = await chrome.cookies.get({
//       url: HOME_URL,
//       name: "_user_id",
//     })
//     if (!uid) {
//       uid = await chrome.cookies.set({
//         url: HOME_URL,
//         domain: COOKIE_DOMAIN,
//         expirationDate: twoYearsLater,
//         name: "_user_id",
//         value: crypto.randomUUID(),
//       })
//     }
//     let sessionId = await chrome.cookies.get({
//       url: HOME_URL,
//       name: "_session_id",
//     })
//     if (!sessionId) {
//       sessionId = await chrome.cookies.set({
//         url: HOME_URL,
//         domain: COOKIE_DOMAIN,
//         name: "_session_id",
//         value: crypto.randomUUID(),
//       })
//     }

//     if (cid && uid && sessionId) {
//       return {
//         client_id: cid.value,
//         user_id: uid.value,
//         session_id: sessionId.value,
//       }
//     }
//   } catch (err) {
//     console.error(err)
//   }

//   const { _client_id, _user_id } = await getLocal({
//     _client_id: "",
//     _user_id: "",
//   })
//   let client_id = _client_id
//   let user_id = _user_id
//   if (!client_id || !user_id) {
//     client_id = _client_id || crypto.randomUUID()
//     user_id = _user_id || crypto.randomUUID()
//     await setLocal({
//       _client_id: client_id,
//       _user_id: user_id,
//     })
//   }

//   const { _session_id } = await getSession({
//     _session_id: "",
//   })
//   let session_id = _session_id
//   if (!session_id) {
//     session_id = crypto.randomUUID()
//     await setSession({
//       _session_id: session_id,
//     })
//   }

//   return { client_id, user_id, session_id }
// }
