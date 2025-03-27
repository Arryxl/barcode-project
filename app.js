require('dotenv').config();
const express = require('express');
const sql = require('mssql'); // Importar mssql
const cors = require('cors');
const path = require('path');
const say = require('say');

const app = express();
const port = 3000;

app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const dbConfig = {
    user: 'sa',
    password: 'Sebastortu99',
    server: 'DESKTOP-QJTS0A2',
    database: 'BD00502',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function connectToDatabase() {
    try {
        await sql.connect(dbConfig);
        console.log('Conectado a SQL Server');
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
    }
}
connectToDatabase();

app.get('/api/productos/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const result = await sql.query`
            SELECT ISNULL(RTRIM(v121_descripcion),'') AS Descripcion,  
                CAST(v121_id_item AS VARCHAR(20)) AS Id,  
                ISNULL(RTRIM(f131_id),'') AS Barras,  
                v121_referencia,  
                dbo.F_GENERICO_HALLAR_PREC_VTA(f131_id_cia, '001', f131_rowid_item_ext, GETDATE(), f131_id_unidad_medida) AS Precio,  
                CASE 
                    WHEN ISNUMERIC(LTRIM(RTRIM(dbo.F_GENERICO_HALLAR_MOVTO_ENT(f131_id_cia, ISNULL(v121_rowid_entidad_item, 0), '001', 'FACTOR', 3)))) = 1 
                    THEN CAST(LTRIM(RTRIM(dbo.F_GENERICO_HALLAR_MOVTO_ENT(f131_id_cia, ISNULL(v121_rowid_entidad_item, 0), '001', 'FACTOR', 3))) AS DECIMAL(28,4)) 
                    ELSE 0 
                END AS Factor,  
                f101_descripcion AS UnidadMedida  
            FROM t131_mc_items_barras 
            INNER JOIN t121_mc_items_extensiones ON f121_rowid = f131_rowid_item_ext  
            INNER JOIN v121 ON f121_rowid_item = v121_rowid_item AND f121_rowid = v121_rowid_item_ext  
            INNER JOIN t101_mc_unidades_medida ON f101_id_cia = v121_id_cia AND f101_id = v121_id_unidad_inventario`;

        if (result.recordset.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error en la consulta:', err);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

const speak = (text) => {
    return new Promise((resolve, reject) => {
        say.speak(text, "Microsoft Sabina Desktop", 1.0, (err) => {
            if (err) {
                console.error("Error al reproducir la voz:", err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

app.get('/api/allproductos', async (req, res) => {
    try {
        const codigo = req.query.codigo;
        const pool = await sql.connect();
        
        const listaPreco = process.env.LISTA_PRECO;
        const company = process.env.COMPANY;
        
        let query = `
            SELECT
                ISNULL(RTRIM(v121_descripcion), '') AS Descripcion,  
                CAST(v121_id_item AS VARCHAR(20)) AS Id,  
                ISNULL(RTRIM(f131_id), '') AS Barras,  
                v121_referencia,
                dbo.F_GENERICO_HALLAR_PREC_VTA(${company},'${listaPreco}',v121_rowid_item, GETDATE(), v121_id_unidad_inventario) AS Precio,    
                CASE
                    WHEN ISNUMERIC(LTRIM(RTRIM(dbo.F_GENERICO_HALLAR_MOVTO_ENT(${company}, ISNULL(v121_rowid_entidad_item, 0), '${listaPreco}', 'FACTOR', 3)))) = 1
                    THEN CAST(LTRIM(RTRIM(dbo.F_GENERICO_HALLAR_MOVTO_ENT(${company}, ISNULL(v121_rowid_entidad_item, 0), '${listaPreco}', 'FACTOR', 3))) AS DECIMAL(28,4))
                    ELSE 0
                END AS Factor,  
                f101_descripcion AS UnidadMedida  
            FROM t131_mc_items_barras
                INNER JOIN t121_mc_items_extensiones ON f121_rowid = f131_rowid_item_ext
                INNER JOIN v121 ON f121_rowid_item = v121_rowid_item AND f121_rowid = v121_rowid_item_ext
                INNER JOIN t101_mc_unidades_medida ON f101_id_cia = v121_id_cia AND f101_id = v121_id_unidad_inventario
                LEFT JOIN t122_mc_items_unidades ON f122_id_cia = f131_id_cia AND f122_rowid_item = v121_rowid_item AND f122_id_unidad = f131_id_unidad_medida
            WHERE f131_id = '${codigo}'`;
        

        const result = await pool.request().query(query);
        
        if (result.recordset.length === 0) {
            console.log("Producto no encontrado");
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const producto = result.recordset[0];
        const texto = `Su producto vale ${producto.Precio} pesos`;
        res.json(result.recordset);
        await speak(texto);
    } catch (err) {
        console.error('Error en la consulta:', err);
        if (!res.headersSent) {
            return res.status(500).json({ mensaje: 'Error en el servidor', error: err.message });
        }
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
