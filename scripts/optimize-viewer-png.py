"""Lossless PNG recompression keeps the standalone viewer below its upload limit."""
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image
import numpy as np

for filename in sys.argv[1:]:
    path = Path(filename)
    original = path.read_bytes()
    json_size = struct.unpack_from('<I', original, 12)[0]
    document = json.loads(original[20:20 + json_size])
    binary = original[28 + json_size:]
    replacements = {}
    # Export clipping can leave zero-area faces after float32 conversion. Remove
    # them in modified site surfaces; preserve unrelated full-scene geometry.
    authorized = {node['mesh'] for node in document.get('nodes', []) if 'mesh' in node and any(node.get('extras', {}).get(key) for key in ['hotelDrive','hotelDriveGroundCut','garageGroundCut','entryPavingSeam','entryTerrainRepair','surfaceSeamRepair','hotelRoadJoinRepair'])}
    portable = 'Gesamtszene' not in path.name
    removed_triangles = 0
    def accessor(index):
        a = document['accessors'][index]; view = document['bufferViews'][a['bufferView']]
        dtype = np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]); width = {'SCALAR':1,'VEC3':3}[a['type']]
        return np.ndarray((a['count'],width),dtype=dtype,buffer=binary,offset=view.get('byteOffset',0)+a.get('byteOffset',0),strides=(view.get('byteStride',dtype.itemsize*width),dtype.itemsize)).copy()
    processed = set()
    for mesh_id, mesh in enumerate(document.get('meshes', [])):
        if not portable and mesh_id not in authorized: continue
        for primitive in mesh['primitives']:
            index_id = primitive.get('indices')
            if index_id is None or index_id in processed: continue
            processed.add(index_id)
            positions = accessor(primitive['attributes']['POSITION']).astype(np.float64)
            triangles = accessor(index_id).reshape(-1,3)
            pts = positions[triangles]
            normal = np.cross(pts[:,1]-pts[:,0],pts[:,2]-pts[:,0])
            valid = np.sum(normal*normal,axis=1)>1e-20
            if valid.all(): continue
            kept = triangles[valid].ravel(); assert len(kept)>0
            a = document['accessors'][index_id]; view_id = a['bufferView']
            assert a.get('byteOffset',0)==0
            assert len([x for x in document['accessors'] if x.get('bufferView')==view_id])==1
            replacements[view_id] = kept.tobytes()
            a['count'] = len(kept); a['min'] = [int(kept.min())]; a['max'] = [int(kept.max())]
            removed_triangles += int((~valid).sum())
    for image in document.get('images', []):
        if image.get('mimeType') != 'image/png':
            continue
        view_id = image['bufferView']
        view = document['bufferViews'][view_id]
        encoded = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        source = Image.open(io.BytesIO(encoded))
        rgba = source.convert('RGBA')
        candidates = [source]
        if rgba.getchannel('A').getextrema() == (255, 255):
            candidates.append(rgba.convert('RGB'))
        colors = rgba.getcolors(256)
        if colors:
            # Exact indexed color, including every alpha value. No color
            # quantization: antialiasing and transparent texture pixels stay
            # byte-identical when decoded as RGBA.
            palette = [color for _, color in colors]
            lookup = {color: index for index, color in enumerate(palette)}
            indexed = Image.frombytes('P', rgba.size, bytes(lookup[pixel] for pixel in rgba.getdata()))
            indexed.putpalette([channel for color in palette for channel in color[:3]] + [0] * (768 - len(palette) * 3))
            indexed.info['transparency'] = bytes(color[3] for color in palette)
            candidates.append(indexed)
        outputs = []
        for candidate in candidates:
            output = io.BytesIO()
            candidate.save(output, format='PNG', optimize=True, compress_level=9)
            outputs.append(output.getvalue())
        replacement = min(outputs, key=len)
        if len(replacement) >= len(encoded):
            continue
        restored = Image.open(io.BytesIO(replacement))
        assert source.size == restored.size
        assert rgba.tobytes() == restored.convert('RGBA').tobytes(), 'Image pixels must remain exactly identical'
        replacements[view_id] = replacement
    packed = bytearray()
    for index, view in enumerate(document['bufferViews']):
        packed.extend(b'\0' * ((-len(packed)) % 4))
        offset = view.get('byteOffset', 0)
        content = replacements.get(index, binary[offset:offset + view['byteLength']])
        view['byteOffset'] = len(packed)
        view['byteLength'] = len(content)
        packed.extend(content)
    document['buffers'][0]['byteLength'] = len(packed)
    packed.extend(b'\0' * ((-len(packed)) % 4))
    json_bytes = json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode()
    json_bytes += b' ' * ((-len(json_bytes)) % 4)
    result = struct.pack('<III', 0x46546C67, 2, 28 + len(json_bytes) + len(packed))
    result += struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
    result += struct.pack('<II', len(packed), 0x004E4942) + packed
    path.write_bytes(result)
    print(json.dumps({'file': path.name, 'losslessImageBytesSaved': len(original) - len(result), 'pixelsPreserved': True, 'removedDegenerateTriangles':removed_triangles}))
