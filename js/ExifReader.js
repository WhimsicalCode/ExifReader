// Generated by CoffeeScript 1.6.2
/*
# ExifReader 0.1
# http://github.com/mattiasw/exifreader
# Copyright (C) 2011  Mattias Wallander <mattias@wallander.eu>
# Licensed under the GNU Lesser General Public License version 3 or later
# See license text at http://www.gnu.org/licenses/lgpl.txt
*/


(function() {
  (typeof exports !== "undefined" && exports !== null ? exports : this).ExifReader = (function() {
    function ExifReader() {
      var _this = this;

      this._getTagValueAt = {
        1: function(offset) {
          return _this._getByteAt(offset);
        },
        2: function(offset) {
          return _this._getAsciiAt(offset);
        },
        3: function(offset) {
          return _this._getShortAt(offset);
        },
        4: function(offset) {
          return _this._getLongAt(offset);
        },
        5: function(offset) {
          return _this._getRationalAt(offset);
        },
        7: function(offset) {
          return _this._getUndefinedAt(offset);
        },
        9: function(offset) {
          return _this._getSlongAt(offset);
        },
        10: function(offset) {
          return _this._getSrationalAt(offset);
        }
      };
    }

    /*
    # Loads all the Exif tags from the specified image file buffer.
    #
    # data ArrayBuffer Image file data
    */


    ExifReader.prototype.load = function(data) {
      return this.loadView(new DataView(data));
    };

    /*
    # Loads all the Exif tags from the specified image file buffer view. Probably
    # used when DataView isn't supported by the browser.
    #
    # @_dataView DataView Image file data view
    */


    ExifReader.prototype.loadView = function(_dataView) {
      this._dataView = _dataView;
      this._tags = {};
      this._checkImageHeader();
      return this._readTags();
    };

    ExifReader.prototype._checkImageHeader = function() {
      var byteLength, dataView, i;

      dataView = this._dataView;
      byteLength = dataView.byteLength;
      if (byteLength < 12) {
        throw new Error('Data buffer too short');
      }
      if (dataView.getUint32(0, false) === 0xffd8ffe1) {
        if (dataView.getUint32(6, false) === 0x45786966 && dataView.getUint16(10, false) === 0x0000) {
          this._tiffHeaderOffset = 0x0c;
          return;
        }
      } else if (dataView.getUint32(0, false) === 0xffd8ffe0) {
        i = 10;
        while (i < byteLength) {
          if (dataView.getUint8(i, false) === 0x45 && dataView.getUint32(i, false) === 0x45786966 && dataView.getUint16(i + 4, false) === 0x0000) {
            this._tiffHeaderOffset = i + 6;
            return;
          }
          i++;
        }
      } else {
        throw new Error('Invalid image format');
      }
      throw new Error('No Exif data');
    };

    ExifReader.prototype._readTags = function() {
      this._setByteOrder();
      this._read0thIfd();
      this._readExifIfd();
      this._readGpsIfd();
      return this._readInteroperabilityIfd();
    };

    ExifReader.prototype._setByteOrder = function() {
      if (this._dataView.getUint16(this._tiffHeaderOffset) === 0x4949) {
        return this._littleEndian = true;
      } else if (this._dataView.getUint16(this._tiffHeaderOffset) === 0x4d4d) {
        return this._littleEndian = false;
      } else {
        throw new Error('Illegal byte order value. Faulty image.');
      }
    };

    ExifReader.prototype._read0thIfd = function() {
      var ifdOffset;

      ifdOffset = this._getIfdOffset();
      return this._readIfd('0th', ifdOffset);
    };

    ExifReader.prototype._getIfdOffset = function() {
      return this._tiffHeaderOffset + this._getLongAt(this._tiffHeaderOffset + 4);
    };

    ExifReader.prototype._readExifIfd = function() {
      var ifdOffset;

      if (this._tags['Exif IFD Pointer'] != null) {
        ifdOffset = this._tiffHeaderOffset + this._tags['Exif IFD Pointer'].value;
        return this._readIfd('exif', ifdOffset);
      }
    };

    ExifReader.prototype._readGpsIfd = function() {
      var ifdOffset;

      if (this._tags['GPS Info IFD Pointer'] != null) {
        ifdOffset = this._tiffHeaderOffset + this._tags['GPS Info IFD Pointer'].value;
        return this._readIfd('gps', ifdOffset);
      }
    };

    ExifReader.prototype._readInteroperabilityIfd = function() {
      var ifdOffset;

      if (this._tags['Interoperability IFD Pointer'] != null) {
        ifdOffset = this._tiffHeaderOffset + this._tags['Interoperability IFD Pointer'].value;
        return this._readIfd('interoperability', ifdOffset);
      }
    };

    ExifReader.prototype._readIfd = function(ifdType, offset) {
      var fieldIndex, numberOfFields, tag, _i, _results;

      numberOfFields = this._getShortAt(offset);
      offset += 2;
      _results = [];
      for (fieldIndex = _i = 0; 0 <= numberOfFields ? _i < numberOfFields : _i > numberOfFields; fieldIndex = 0 <= numberOfFields ? ++_i : --_i) {
        tag = this._readTag(ifdType, offset);
        this._tags[tag.name] = {
          'value': tag.value,
          'description': tag.description
        };
        _results.push(offset += 12);
      }
      return _results;
    };

    ExifReader.prototype._readTag = function(ifdType, offset) {
      var tagCode, tagCount, tagDescription, tagName, tagType, tagValue, tagValueOffset;

      tagCode = this._getShortAt(offset);
      tagType = this._getShortAt(offset + 2);
      tagCount = this._getLongAt(offset + 4);
      if (this._typeSizes[tagType] * tagCount <= 4) {
        tagValue = this._getTagValue(offset + 8, tagType, tagCount);
      } else {
        tagValueOffset = this._getLongAt(offset + 8);
        tagValue = this._getTagValue(this._tiffHeaderOffset + tagValueOffset, tagType, tagCount);
      }
      if (tagType === this._tagTypes['ASCII']) {
        tagValue = this._splitNullSeparatedAsciiString(tagValue);
      }
      if (this._tagNames[ifdType][tagCode] != null) {
        if ((this._tagNames[ifdType][tagCode]['name'] != null) && (this._tagNames[ifdType][tagCode]['description'] != null)) {
          tagName = this._tagNames[ifdType][tagCode]['name'];
          tagDescription = this._tagNames[ifdType][tagCode]['description'](tagValue);
        } else {
          tagName = this._tagNames[ifdType][tagCode];
          if (tagValue instanceof Array) {
            tagDescription = tagValue.join(', ');
          } else {
            tagDescription = tagValue;
          }
        }
        return {
          'name': tagName,
          'value': tagValue,
          'description': tagDescription
        };
      } else {
        return {
          'name': "undefined-" + tagCode,
          'value': tagValue,
          'description': tagValue
        };
      }
    };

    ExifReader.prototype._getTagValue = function(offset, type, count) {
      var tagValue, value, valueIndex;

      value = (function() {
        var _i, _results;

        _results = [];
        for (valueIndex = _i = 0; 0 <= count ? _i < count : _i > count; valueIndex = 0 <= count ? ++_i : --_i) {
          tagValue = this._getTagValueAt[type](offset);
          offset += this._typeSizes[type];
          _results.push(tagValue);
        }
        return _results;
      }).call(this);
      if (value.length === 1) {
        value = value[0];
      } else if (type === this._tagTypes['ASCII']) {
        value = this._getAsciiValue(value);
      }
      return value;
    };

    ExifReader.prototype._getAsciiValue = function(charArray) {
      var char, newCharArray;

      return newCharArray = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = charArray.length; _i < _len; _i++) {
          char = charArray[_i];
          _results.push(String.fromCharCode(char));
        }
        return _results;
      })();
    };

    ExifReader.prototype._getByteAt = function(offset) {
      return this._dataView.getUint8(offset);
    };

    ExifReader.prototype._getAsciiAt = function(offset) {
      return this._dataView.getUint8(offset);
    };

    ExifReader.prototype._getShortAt = function(offset) {
      return this._dataView.getUint16(offset, this._littleEndian);
    };

    ExifReader.prototype._getLongAt = function(offset) {
      return this._dataView.getUint32(offset, this._littleEndian);
    };

    ExifReader.prototype._getRationalAt = function(offset) {
      return this._getLongAt(offset) / this._getLongAt(offset + 4);
    };

    ExifReader.prototype._getUndefinedAt = function(offset) {
      return this._getByteAt(offset);
    };

    ExifReader.prototype._getSlongAt = function(offset) {
      return this._dataView.getInt32(offset, this._littleEndian);
    };

    ExifReader.prototype._getSrationalAt = function(offset) {
      return this._getSlongAt(offset) / this._getSlongAt(offset + 4);
    };

    ExifReader.prototype._splitNullSeparatedAsciiString = function(string) {
      var char, i, tagValue, _i, _len;

      tagValue = [];
      i = 0;
      for (_i = 0, _len = string.length; _i < _len; _i++) {
        char = string[_i];
        if (char === '\x00') {
          i++;
          continue;
        }
        if (tagValue[i] == null) {
          tagValue[i] = '';
        }
        tagValue[i] += char;
      }
      return tagValue;
    };

    ExifReader.prototype._typeSizes = {
      1: 1,
      2: 1,
      3: 2,
      4: 4,
      5: 8,
      7: 1,
      9: 4,
      10: 8
    };

    ExifReader.prototype._tagTypes = {
      'BYTE': 1,
      'ASCII': 2,
      'SHORT': 3,
      'LONG': 4,
      'RATIONAL': 5,
      'UNDEFINED': 7,
      'SLONG': 9,
      'SRATIONAL': 10
    };

    ExifReader.prototype._tagNames = {
      '0th': {
        0x0100: 'ImageWidth',
        0x0101: 'ImageLength',
        0x0102: 'BitsPerSample',
        0x0103: 'Compression',
        0x0106: 'PhotometricInterpretation',
        0x010e: 'ImageDescription',
        0x010f: 'Make',
        0x0110: 'Model',
        0x0111: 'StripOffsets',
        0x0112: {
          'name': 'Orientation',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'top-left';
              case 2:
                return 'top-right';
              case 3:
                return 'bottom-right';
              case 4:
                return 'bottom-left';
              case 5:
                return 'left-top';
              case 6:
                return 'right-top';
              case 7:
                return 'right-bottom';
              case 8:
                return 'left-bottom';
              default:
                return 'Undefined';
            }
          }
        },
        0x0115: 'SamplesPerPixel',
        0x0116: 'RowsPerStrip',
        0x0117: 'StripByteCounts',
        0x011a: 'XResolution',
        0x011b: 'YResolution',
        0x011c: 'PlanarConfiguration',
        0x0128: {
          'name': 'ResolutionUnit',
          'description': function(value) {
            switch (value) {
              case 2:
                return 'inches';
              case 3:
                return 'centimeters';
              default:
                return 'Unknown';
            }
          }
        },
        0x012d: 'TransferFunction',
        0x0131: 'Software',
        0x0132: 'DateTime',
        0x013b: 'Artist',
        0x013e: 'WhitePoint',
        0x013f: 'PrimaryChromaticities',
        0x0201: 'JPEGInterchangeFormat',
        0x0202: 'JPEGInterchangeFormatLength',
        0x0211: 'YCbCrCoefficients',
        0x0212: 'YCbCrSubSampling',
        0x0213: {
          'name': 'YCbCrPositioning',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'centered';
              case 2:
                return 'co-sited';
              default:
                return 'undefied ' + value;
            }
          }
        },
        0x0214: 'ReferenceBlackWhite',
        0x8298: {
          'name': 'Copyright',
          'description': function(value) {
            return value.join('; ');
          }
        },
        0x8769: 'Exif IFD Pointer',
        0x8825: 'GPS Info IFD Pointer'
      },
      'exif': {
        0x829a: 'ExposureTime',
        0x829d: 'FNumber',
        0x8822: {
          'name': 'ExposureProgram',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Undefined';
              case 1:
                return 'Manual';
              case 2:
                return 'Normal program';
              case 3:
                return 'Aperture priority';
              case 4:
                return 'Shutter priority';
              case 5:
                return 'Creative program';
              case 6:
                return 'Action program';
              case 7:
                return 'Portrait mode';
              case 8:
                return 'Landscape mode';
              default:
                return 'Unknown';
            }
          }
        },
        0x8824: 'SpectralSensitivity',
        0x8827: 'ISOSpeedRatings',
        0x8828: {
          'name': 'OECF',
          'description': function(value) {
            return '[Raw OECF table data]';
          }
        },
        0x9000: {
          'name': 'ExifVersion',
          'description': function(value) {
            var char, string, _i, _len;

            string = '';
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              char = value[_i];
              string += String.fromCharCode(char);
            }
            return string;
          }
        },
        0x9003: 'DateTimeOriginal',
        0x9004: 'DateTimeDigitized',
        0x9101: {
          'name': 'ComponentsConfiguration',
          'description': function(value) {
            var char, string, _i, _len;

            string = '';
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              char = value[_i];
              switch (char) {
                case 0x31:
                  string += 'Y';
                  break;
                case 0x32:
                  string += 'Cb';
                  break;
                case 0x33:
                  string += 'Cr';
                  break;
                case 0x34:
                  string += 'R';
                  break;
                case 0x35:
                  string += 'G';
                  break;
                case 0x36:
                  string += 'B';
              }
            }
            return string;
          }
        },
        0x9102: 'CompressedBitsPerPixel',
        0x9201: 'ShutterSpeedValue',
        0x9202: 'ApertureValue',
        0x9203: 'BrightnessValue',
        0x9204: 'ExposureBiasValue',
        0x9205: 'MaxApertureValue',
        0x9206: 'SubjectDistance',
        0x9207: {
          'name': 'MeteringMode',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'Average';
              case 2:
                return 'CenterWeightedAverage';
              case 3:
                return 'Spot';
              case 4:
                return 'MultiSpot';
              case 5:
                return 'Pattern';
              case 6:
                return 'Partial';
              case 255:
                return 'Other';
              default:
                return 'Unknown';
            }
          }
        },
        0x9208: {
          'name': 'LightSource',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'Daylight';
              case 2:
                return 'Fluorescent';
              case 3:
                return 'Tungsten (incandescent light)';
              case 4:
                return 'Flash';
              case 9:
                return 'Fine weather';
              case 10:
                return 'Cloudy weather';
              case 11:
                return 'Shade';
              case 12:
                return 'Daylight fluorescent (D 5700 – 7100K)';
              case 13:
                return 'Day white fluorescent (N 4600 – 5400K)';
              case 14:
                return 'Cool white fluorescent (W 3900 – 4500K)';
              case 15:
                return 'White fluorescent (WW 3200 – 3700K)';
              case 17:
                return 'Standard light A';
              case 18:
                return 'Standard light B';
              case 19:
                return 'Standard light C';
              case 20:
                return 'D55';
              case 21:
                return 'D65';
              case 22:
                return 'D75';
              case 23:
                return 'D50';
              case 24:
                return 'ISO studio tungsten';
              case 255:
                return 'Other light source';
              default:
                return 'Unknown';
            }
          }
        },
        0x9209: {
          'name': 'Flash',
          'description': function(value) {
            switch (value) {
              case 0x00:
                return 'Flash did not fire';
              case 0x01:
                return 'Flash fired';
              case 0x05:
                return 'Strobe return light not detected';
              case 0x07:
                return 'Strobe return light detected';
              case 0x09:
                return 'Flash fired, compulsory flash mode';
              case 0x0d:
                return 'Flash fired, compulsory flash mode, return light not detected';
              case 0x0f:
                return 'Flash fired, compulsory flash mode, return light detected';
              case 0x10:
                return 'Flash did not fire, compulsory flash mode';
              case 0x18:
                return 'Flash did not fire, auto mode';
              case 0x19:
                return 'Flash fired, auto mode';
              case 0x1d:
                return 'Flash fired, auto mode, return light not detected';
              case 0x1f:
                return 'Flash fired, auto mode, return light detected';
              case 0x20:
                return 'No flash function';
              case 0x41:
                return 'Flash fired, red-eye reduction mode';
              case 0x45:
                return 'Flash fired, red-eye reduction mode, return light not detected';
              case 0x47:
                return 'Flash fired, red-eye reduction mode, return light detected';
              case 0x49:
                return 'Flash fired, compulsory flash mode, red-eye reduction mode';
              case 0x4d:
                return 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected';
              case 0x4f:
                return 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected';
              case 0x59:
                return 'Flash fired, auto mode, red-eye reduction mode';
              case 0x5d:
                return 'Flash fired, auto mode, return light not detected, red-eye reduction mode';
              case 0x5f:
                return 'Flash fired, auto mode, return light detected, red-eye reduction mode';
              default:
                return 'Unknown';
            }
          }
        },
        0x920a: 'FocalLength',
        0x9214: {
          'name': 'SubjectArea',
          'description': function(value) {
            switch (value.length) {
              case 2:
                return "Location; X: " + value[0] + ", Y: " + value[1];
              case 3:
                return "Circle; X: " + value[0] + ", Y: " + value[1] + ", diameter: " + value[2];
              case 4:
                return "Rectangle; X: " + value[0] + ", Y: " + value[1] + ", width: " + value[2] + ", height: " + value[3];
              default:
                return 'Unknown';
            }
          }
        },
        0x927c: {
          'name': 'MakerNote',
          'description': function(value) {
            return '[Raw maker note data]';
          }
        },
        0x9286: {
          'name': 'UserComment',
          'description': function(value) {
            switch (value.slice(0, 8).map(function(byte) {
                  return String.fromCharCode(byte);
                }).join('')) {
              case 'ASCII\x00\x00\x00':
                return value.slice(8, value.length).map(function(byte) {
                  return String.fromCharCode(byte);
                }).join('');
              case 'JIS\x00\x00\x00\x00\x00':
                return '[JIS encoded text]';
              case 'UNICODE\x00':
                return '[Unicode encoded text]';
              case '\x00\x00\x00\x00\x00\x00\x00\x00':
                return '[Undefined encoding]';
            }
          }
        },
        0x9290: 'SubSecTime',
        0x9291: 'SubSecTimeOriginal',
        0x9292: 'SubSecTimeDigitized',
        0xa000: {
          'name': 'FlashpixVersion',
          'description': function(value) {
            var char, string, _i, _len;

            string = '';
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              char = value[_i];
              string += String.fromCharCode(char);
            }
            return string;
          }
        },
        0xa001: {
          'name': 'ColorSpace',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'sRGB';
              case 0xffff:
                return 'Uncalibrated';
              default:
                return 'Unknown';
            }
          }
        },
        0xa002: 'PixelXDimension',
        0xa003: 'PixelYDimension',
        0xa004: 'RelatedSoundFile',
        0xa005: 'Interoperability IFD Pointer',
        0xa20b: 'FlashEnergy',
        0xa20c: {
          'name': 'SpatialFrequencyResponse',
          'description': function(value) {
            return '[Raw SFR table data]';
          }
        },
        0xa20e: 'FocalPlaneXResolution',
        0xa20f: 'FocalPlaneYResolution',
        0xa210: {
          'name': 'FocalPlaneResolutionUnit',
          'description': function(value) {
            switch (value) {
              case 2:
                return 'inches';
              case 3:
                return 'centimeters';
              default:
                return 'Unknown';
            }
          }
        },
        0xa214: {
          'name': 'SubjectLocation',
          'description': function(value) {
            return "X: " + value[0] + ", Y: " + value[1];
          }
        },
        0xa215: 'ExposureIndex',
        0xa217: {
          'name': 'SensingMethod',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'Undefined';
              case 2:
                return 'One-chip color area sensor';
              case 3:
                return 'Two-chip color area sensor';
              case 4:
                return 'Three-chip color area sensor';
              case 5:
                return 'Color sequential area sensor';
              case 7:
                return 'Trilinear sensor';
              case 8:
                return 'Color sequential linear sensor';
              default:
                return 'Unknown';
            }
          }
        },
        0xa300: {
          'name': 'FileSource',
          'description': function(value) {
            switch (value) {
              case 3:
                return 'DSC';
              default:
                return 'Unknown';
            }
          }
        },
        0xa301: {
          'name': 'SceneType',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'A directly photographed image';
              default:
                return 'Unknown';
            }
          }
        },
        0xa302: {
          'name': 'CFAPattern',
          'description': function(value) {
            return '[Raw CFA pattern table data]';
          }
        },
        0xa401: {
          'name': 'CustomRendered',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Normal process';
              case 1:
                return 'Custom process';
              default:
                return 'Unknown';
            }
          }
        },
        0xa402: {
          'name': 'ExposureMode',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Auto exposure';
              case 1:
                return 'Manual exposure';
              case 2:
                return 'Auto bracket';
              default:
                return 'Unknown';
            }
          }
        },
        0xa403: {
          'name': 'WhiteBalance',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Auto white balance';
              case 1:
                return 'Manual white balance';
              default:
                return 'Unknown';
            }
          }
        },
        0xa404: {
          'name': 'DigitalZoomRatio',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Digital zoom was not used';
              default:
                return value;
            }
          }
        },
        0xa405: {
          'name': 'FocalLengthIn35mmFilm',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Unknown';
              default:
                return value;
            }
          }
        },
        0xa406: {
          'name': 'SceneCaptureType',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Standard';
              case 1:
                return 'Landscape';
              case 2:
                return 'Portrait';
              case 3:
                return 'Night scene';
              default:
                return 'Unknown';
            }
          }
        },
        0xa407: {
          'name': 'GainControl',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'None';
              case 1:
                return 'Low gain up';
              case 2:
                return 'High gain up';
              case 3:
                return 'Low gain down';
              case 4:
                return 'High gain down';
              default:
                return 'Unknown';
            }
          }
        },
        0xa408: {
          'name': 'Contrast',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Normal';
              case 1:
                return 'Soft';
              case 2:
                return 'Hard';
              default:
                return 'Unknown';
            }
          }
        },
        0xa409: {
          'name': 'Saturation',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Normal';
              case 1:
                return 'Low saturation';
              case 2:
                return 'High saturation';
              default:
                return 'Unknown';
            }
          }
        },
        0xa40a: {
          'name': 'Sharpness',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Normal';
              case 1:
                return 'Soft';
              case 2:
                return 'Hard';
              default:
                return 'Unknown';
            }
          }
        },
        0xa40b: {
          'name': 'DeviceSettingDescription',
          'description': function(value) {
            return '[Raw device settings table data]';
          }
        },
        0xa40c: {
          'name': 'SubjectDistanceRange',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'Macro';
              case 2:
                return 'Close view';
              case 3:
                return 'Distant view';
              default:
                return 'Unknown';
            }
          }
        },
        0xa420: 'ImageUniqueID'
      },
      'gps': {
        0x0000: {
          'name': 'GPSVersionID',
          'description': function(value) {
            var _ref, _ref1;

            if ((value[0] === (_ref = value[1]) && _ref === 2) && (value[2] === (_ref1 = value[3]) && _ref1 === 0)) {
              return 'Version 2.2';
            } else {
              return 'Unknown';
            }
          }
        },
        0x0001: {
          'name': 'GPSLatitudeRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'N':
                return 'North latitude';
              case 'S':
                return 'South latitude';
              default:
                return 'Unknown';
            }
          }
        },
        0x0002: {
          'name': 'GPSLatitude',
          'description': function(value) {
            return value[0] + value[1] / 60 + value[2] / 3600;
          }
        },
        0x0003: {
          'name': 'GPSLongitudeRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'E':
                return 'East longitude';
              case 'W':
                return 'West longitude';
              default:
                return 'Unknown';
            }
          }
        },
        0x0004: {
          'name': 'GPSLongitude',
          'description': function(value) {
            return value[0] + value[1] / 60 + value[2] / 3600;
          }
        },
        0x0005: {
          'name': 'GPSAltitudeRef',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Sea level';
              case 1:
                return 'Sea level reference (negative value)';
              default:
                return 'Unknown';
            }
          }
        },
        0x0006: {
          'name': 'GPSAltitude',
          'description': function(value) {
            return value + ' m';
          }
        },
        0x0007: {
          'name': 'GPSTimeStamp',
          'description': function(value) {
            var padZero;

            padZero = function(num) {
              var i;

              return ((function() {
                var _i, _ref, _results;

                _results = [];
                for (i = _i = 0, _ref = 2 - ('' + Math.floor(num)).length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                  _results.push('0');
                }
                return _results;
              })()) + num;
            };
            return value.map(padZero).join(':');
          }
        },
        0x0008: 'GPSSatellites',
        0x0009: {
          'name': 'GPSStatus',
          'description': function(value) {
            switch (value.join('')) {
              case 'A':
                return 'Measurement in progress';
              case 'V':
                return 'Measurement Interoperability';
              default:
                return 'Unknown';
            }
          }
        },
        0x000a: {
          'name': 'GPSMeasureMode',
          'description': function(value) {
            switch (value.join('')) {
              case '2':
                return '2-dimensional measurement';
              case '3':
                return '3-dimensional measurement';
              default:
                return 'Unknown';
            }
          }
        },
        0x000b: 'GPSDOP',
        0x000c: {
          'name': 'GPSSpeedRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'K':
                return 'Kilometers per hour';
              case 'M':
                return 'Miles per hour';
              case 'N':
                return 'Knots';
              default:
                return 'Unknown';
            }
          }
        },
        0x000d: 'GPSSpeed',
        0x000e: {
          'name': 'GPSTrackRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'T':
                return 'True direction';
              case 'M':
                return 'Magnetic direction';
              default:
                return 'Unknown';
            }
          }
        },
        0x000f: 'GPSTrack',
        0x0010: {
          'name': 'GPSImgDirectionRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'T':
                return 'True direction';
              case 'M':
                return 'Magnetic direction';
              default:
                return 'Unknown';
            }
          }
        },
        0x0011: 'GPSImgDirection',
        0x0012: 'GPSMapDatum',
        0x0013: {
          'name': 'GPSDestLatitudeRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'N':
                return 'North latitude';
              case 'S':
                return 'South latitude';
              default:
                return 'Unknown';
            }
          }
        },
        0x0014: {
          'name': 'GPSDestLatitude',
          'description': function(value) {
            return value[0] + value[1] / 60 + value[2] / 3600;
          }
        },
        0x0015: {
          'name': 'GPSDestLongitudeRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'E':
                return 'East longitude';
              case 'W':
                return 'West longitude';
              default:
                return 'Unknown';
            }
          }
        },
        0x0016: {
          'name': 'GPSDestLongitude',
          'description': function(value) {
            return value[0] + value[1] / 60 + value[2] / 3600;
          }
        },
        0x0017: {
          'name': 'GPSDestBearingRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'T':
                return 'True direction';
              case 'M':
                return 'Magnetic direction';
              default:
                return 'Unknown';
            }
          }
        },
        0x0018: 'GPSDestBearing',
        0x0019: {
          'name': 'GPSDestDistanceRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'K':
                return 'Kilometers';
              case 'M':
                return 'Miles';
              case 'N':
                return 'Knots';
              default:
                return 'Unknown';
            }
          }
        },
        0x001a: 'GPSDestDistance',
        0x001b: {
          'name': 'GPSProcessingMethod',
          'description': function(value) {
            switch (value.slice(0, 8).map(function(byte) {
                  return String.fromCharCode(byte);
                }).join('')) {
              case 'ASCII\x00\x00\x00':
                return value.slice(8, value.length).map(function(byte) {
                  return String.fromCharCode(byte);
                }).join('');
              case 'JIS\x00\x00\x00\x00\x00':
                return '[JIS encoded text]';
              case 'UNICODE\x00':
                return '[Unicode encoded text]';
              case '\x00\x00\x00\x00\x00\x00\x00\x00':
                return '[Undefined encoding]';
            }
          }
        },
        0x001c: {
          'name': 'GPSAreaInformation',
          'description': function(value) {
            switch (value.slice(0, 8).map(function(byte) {
                  return String.fromCharCode(byte);
                }).join('')) {
              case 'ASCII\x00\x00\x00':
                return value.slice(8, value.length).map(function(byte) {
                  return String.fromCharCode(byte);
                }).join('');
              case 'JIS\x00\x00\x00\x00\x00':
                return '[JIS encoded text]';
              case 'UNICODE\x00':
                return '[Unicode encoded text]';
              case '\x00\x00\x00\x00\x00\x00\x00\x00':
                return '[Undefined encoding]';
            }
          }
        },
        0x001d: 'GPSDateStamp',
        0x001e: {
          'name': 'GPSDifferential',
          'description': function(value) {
            switch (value) {
              case 0:
                return 'Measurement without differential correction';
              case 1:
                return 'Differential correction applied';
              default:
                return 'Unknown';
            }
          }
        }
      },
      'interoperability': {
        0x0001: 'InteroperabilityIndex',
        0x0002: 'UnknownInteroperabilityTag0x0002',
        0x1001: 'UnknownInteroperabilityTag0x1001',
        0x1002: 'UnknownInteroperabilityTag0x1002'
      }
    };

    /*
    # Gets the image's value of the tag with the given name.
    #
    # name string The name of the tag to get the value of
    #
    # Returns the value of the tag with the given name if it exists,
    # otherwise throws "Undefined".
    */


    ExifReader.prototype.getTagValue = function(name) {
      if (this._tags[name] != null) {
        return this._tags[name].value;
      } else {
        throw new Error('Undefined');
      }
    };

    /*
    # Gets the image's description of the tag with the given name.
    #
    # name string The name of the tag to get the description of
    #
    # Returns the description of the tag with the given name if it exists,
    # otherwise throws "Undefined".
    */


    ExifReader.prototype.getTagDescription = function(name) {
      if (this._tags[name] != null) {
        return this._tags[name].description;
      } else {
        throw new Error('Undefined');
      }
    };

    /*
    # Gets all the image's tags.
    #
    # Returns the image's tags as an associative array: name -> description.
    */


    ExifReader.prototype.getAllTags = function() {
      return this._tags;
    };

    return ExifReader;

  })();

}).call(this);