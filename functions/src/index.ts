import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

exports.notifyAdmin = functions.firestore
  .document('/transacciones/{documentId}')
  .onCreate(async snap => {
    const data = snap.data();

    const adminlist = await admin
      .firestore()
      .collection('uinfo')
      .where('rol', '==', 'admin')
      .get();

    const payload = {
      notification: {
        priority: 'high',
        sound: 'default',
        title: 'NUEVA TRANSACCION',
        body: `MONTO\: ${data.monto_dolares}$ CLIENTE\: ${
          data.usuario.nombres + ' ' + data.usuario.apellidos
        }`,
      },
    };
    const tokens: string[] = [];
    adminlist.docs.forEach(el => {
      const token = el.data().token;
      if (token !== null && token !== '') {
        tokens.push(token);
      }
    });
    if (tokens.length !== 0) {
      return admin.messaging().sendToDevice(tokens, payload);
    }
    return;
  });

exports.notifyClient = functions.firestore
  .document('/transacciones/{documentId}')
  .onUpdate(async snap => {
    const data = snap.after.data();

    const user = await admin
      .firestore()
      .collection('uinfo')
      .doc(data.usuario.uid)
      .get();

    const userdata = user.data();

    const payload = {
      notification: {
        title: `Transaccion AVS`,
        body: `${data.nombre_titular}
Su transaccion ha sido ${data.estado.toLowerCase()}.`,
      },
    };
    if (userdata != undefined && userdata.token !== null) {
      return admin.messaging().sendToDevice(userdata.token, payload);
    }
    return false;
  });

exports.notifyAll = functions.firestore
  .document('/noticias/{documentId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const payload = {
      notification: {
        title: data.titulo,
        body:
          data.mensaje.length < 40
            ? data.mensaje
            : data.mensaje.substring(0, 40) + '...',
      },
    };
    const docs = await admin
      .firestore()
      .collection('uinfo')
      .where('rol', '==', 'cliente')
      .get();
    const tokens: string[] = [];

    docs.docs.forEach(el => {
      const token = el.data().token;
      if (token !== null && token !== '' && token !== undefined) {
        tokens.push(token);
      }
    });
    return admin.messaging().sendToDevice(tokens, payload);
  });

exports.notifyAdminNewRegister = functions.firestore
  .document('/uinfo/{documentId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const adminlist = await admin
      .firestore()
      .collection('uinfo')
      .where('rol', '==', 'admin')
      .get();
    const payload = {
      notification: {
        priority: 'high',
        sound: 'default',
        title: 'NUEVO CLIENTE REGISTRADO',
        body: `${
          data.nombres + ' ' + data.apellidos
        } SE HA REGISTRADO EN AVS CAMBIOS`,
      },
    };
    const tokens: string[] = [];
    adminlist.docs.forEach(el => {
      const token = el.data().token;
      if (token !== null) {
        tokens.push(token);
      }
    });
    if (tokens.length !== 0) {
      return admin.messaging().sendToDevice(tokens, payload);
    }
    return;
  });

exports.notifyVerifiedClient = functions.firestore
  .document('/uinfo/{documentId}')
  .onUpdate(async (snap, context) => {
    if (
      snap.before.data().state === snap.after.data().state ||
      snap.after.data().state === 0
    ) {
      return;
    }
    const data = snap.after.data();
    let state =
      snap.after.data().state === 2
        ? 'DESACTIVADA'
        : snap.after.data().state === 1
        ? 'ACTIVADA'
        : 'BLOQUEADA';

    const payload = {
      notification: {
        priority: 'high',
        sound: 'default',
        title: 'AVS Cambios',
        body: `${
          data.nombres + ' ' + data.apellidos
        } SU CUENTA HA SIDO ${state}`,
      },
    };
    if (data.token !== null) {
      return admin.messaging().sendToDevice(data.token, payload);
    }
    return false;
  });
