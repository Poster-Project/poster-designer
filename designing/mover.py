import glob, json, os, math

images = glob.glob('../working-data/exports/**/*.png')
for i in images:
    # move the images to a single dir
    os.rename(i, '../working-data/final-images/' + i.split('/')[-2] + '.png')
