(function () {
    // good coding practices
    "use strict";

    angular.module("imageService", []).service("imageService", ["$q", function ($q) {

        Element.prototype.remove = function () {
            this.parentElement.removeChild(this);
        }
        NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
            for (var i = this.length - 1; i >= 0; i--) {
                if (this[i] && this[i].parentElement) {
                    this[i].parentElement.removeChild(this[i]);
                }
            }
        }

        var dataUrlToBlob = function (dataUrl) {
            var base64Marker = ";base64,";
            var parts;
            var contentType;
            var raw;
            if (dataUrl.indexOf(base64Marker) === -1) {
                parts = dataUrl.split(",");
                contentType = parts[0].split(":")[1];
                raw = decodeURIComponent(parts[1]);
                return new Blob([raw], { type: contentType });
            } else {
                parts = dataUrl.split(base64Marker);
                contentType = parts[0].split(":")[1];
                raw = window.atob(parts[1]);
                var rawLength = raw.length;

                var uInt8Array = new Uint8Array(rawLength);

                for (var i = 0; i < rawLength; ++i) {
                    uInt8Array[i] = raw.charCodeAt(i);
                }

                return new Blob([uInt8Array], { type: contentType });
            }
        }

        this.getDataUrlFromFile = function (file) {
            var defer = $q.defer();
            var fileLoader = new FileReader();
            fileLoader.readAsDataURL(file);

            // setup the file loader onload function
            // once the file loader has the data it passes it to the 
            // image object which, once the image has loaded, 
            // triggers the images onload function
            fileLoader.onload = function () {
                defer.resolve(this.result);
            };

            fileLoader.onabort = function () {
                defer.reject("Error (ImageService): The upload was aborted.");
            };

            fileLoader.onerror = function () {
                defer.reject("Error (ImageService): An error occured while reading the file.");
            };

            return defer.promise;
        }


        var resize = function (imageObj, height, width, imageEncoding) {

            // Check for empty images
            if (imageObj.width === 0 || imageObj.height === 0) {
                console.log("Error (ImageService): empty image");
                return false;
            }
            // create a hidden canvas object we can use to create the new resized image data
            var canvas = document.createElement("canvas");
            canvas.id = "hiddenCanvas";
            canvas.width = width;
            canvas.height = height;
            canvas.style.visibility = "hidden";
            document.body.appendChild(canvas);

            // draw image on canvas
            var ctx = canvas.getContext("2d");
            ctx.drawImage(imageObj, 0, 0, width, height);

            var blob = dataUrlToBlob(canvas.toDataURL(imageEncoding));

            canvas.remove();

            return blob;
        }


        var resizeCalculate = function (dataUrl, maxWidth, maxHeight, imageEncoding, smallerThanIsAllowed, keepAspectRatio) {
            var defer = $q.defer();
            var imageObj = new Image();

            imageObj.src = dataUrl;

            // set up the images onload function which creates a hidden canvas context, 
            // draws the new image then gets the blob data from it
            imageObj.onload = function () {

                if (smallerThanIsAllowed && this.width < maxWidth && this.height < maxHeight) {
                    var blob = dataUrlToBlob(dataUrl);
                    // tell the blob it's size
                    blob.height = this.height;
                    blob.width = this.width;
                    defer.resolve(blob);
                }
                var height = imageObj.height;
                var width = imageObj.width;

                if (keepAspectRatio) {
                    // calculate the width and height, constraining the proportions
                    if (width > height && width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    } else if (height > width && height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                } else {
                    // do not calculate anything, just set the values
                    if (width > maxWidth) {
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        height = maxHeight;
                    }
                }
                
                var resizedBlob = resize(imageObj, height, width, imageEncoding);
                if (!resizedBlob) {
                    defer.reject("Error (ImageService): Image is empty");
                };
                // tell the blob it's size
                resizedBlob.height = height;
                resizedBlob.width = width;
                defer.resolve(resizedBlob);
            };

            imageObj.onabort = function () {
                defer.reject("Error (ImageService): Image load was aborted.");
            };

            imageObj.onerror = function () {
                defer.reject("Error (ImageService): An error occured while loading image.");
            };


            return defer.promise;
        }

        this.resizeFileTo = function (file, options) {

            var smallerThanIsAllowed = options.smallerThanIsAllowed || true;
            var maxWidth = options.maxWidth || 1920;
            var maxHeight = options.maxHeight || 1080;
            var imageEncoding = options.imageEncoding || null; // todo write detection for file type if it is not defined 
            var keepAspectRatio = options.keepAspectRatio || true;

            // check for an image       
            if (!file.type.match("image.*")) {
                console.log("Error (ImageService): File is not an image");
                return false;
            };
            return this.getDataUrlFromFile(file).then(
                function (dataUrl) {
                    return resizeCalculate(dataUrl, maxWidth, maxHeight, imageEncoding, smallerThanIsAllowed, keepAspectRatio).then(
                        function (image) {
                            // reset the meta data of the file to the blob
                            if (file.name) {
                                image.name = file.name;
                            }
                            if (file.lastModified) {
                                image.lastModified = file.lastModified;
                            }
                            if (file.lastModifiedDate) {
                                image.lastModifiedDate = file.lastModifiedDate;
                            }
                            return image;
                        });
                });
        }


    }]);

}
	());
